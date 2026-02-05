# src/app/services/billing/pricing_provider.py

import json
from decimal import Decimal
from typing import Optional, Dict
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Currency, Feature, Price, ProductType, BillingCycle
from app.dao.product.feature_dao import FeatureDao
from app.services.redis_service import RedisService
from app.schemas.product.product_schemas import PriceInfo, TierInfo
from app.services.exceptions import ConfigurationError

class PricingProvider:
    """
    [核心组件] 提供一个高效、缓存优先的价格查询服务。
    这个服务现在能够更智能地根据上下文解析价格。
    """
    _CACHE_PREFIX = "price:feature:"
    _CACHE_EXPIRY = timedelta(minutes=15) # [IMPROVEMENT] Cache expiry for pricing

    def __init__(self, db: AsyncSession, redis: RedisService):
        self.db = db
        self.redis = redis
        self.feature_dao = FeatureDao(db)

    def _get_cache_key(self, feature_id: int, currency: Currency) -> str:
        # [CRITICAL CHANGE] Cache key now includes currency
        return f"{self._CACHE_PREFIX}{feature_id}:{currency}"

    async def get_price_info(self, feature: Feature, currency: Currency) -> Optional[PriceInfo]:
        """
        [REFACTORED CORE METHOD]
        Gets the PriceInfo DTO for a given Feature ORM object.
        It assumes 'feature.product.prices' has been preloaded.
        This method is now cache-first and data-parsing-second.
        """
        cache_key = self._get_cache_key(feature.id, currency)
        
        # 1. Try cache first
        cached_info = await self.redis.get_json(cache_key)
        if cached_info:
            return PriceInfo.model_validate(cached_info) if cached_info != "NOT_FOUND" else None

        # 2. Cache miss: Parse the pre-loaded ORM object
        price_info = self._parse_price_from_feature(feature, currency)
        
        # 3. Cache the result
        await self.redis.set_json(cache_key, price_info.model_dump(mode='json') if price_info else "NOT_FOUND", expire=self._CACHE_EXPIRY)
        
        return price_info

    def _parse_price_from_feature(self, feature: Feature, currency: Currency) -> Optional[PriceInfo]:
        """
        [NEW HELPER] Pure, synchronous function to parse PriceInfo from a Feature object.
        This isolates the parsing logic and makes it easily testable.
        """
        if not feature.product or not feature.product.prices:
            return None

        # 3. 价格解析与选择逻辑
        candidate_prices = [p for p in feature.product.prices if p.is_active and p.currency == currency]

        if not candidate_prices:
            return None

        # [CRITICAL CHANGE] 更智能的价格选择：
        # 对于按量产品，我们通常期望只有一种活跃的、特定货币的价格。
        # 如果有多个，需要更复杂的业务规则（例如，根据用户等级选择）。
        # V1 简单选择第一个匹配的价格，但这里已为未来扩展准备好。
        selected_price_orm = candidate_prices[0] 

        # 4. 构建 PriceInfo DTO，支持平面或阶梯价格
        price_info_data = {
            "currency": selected_price_orm.currency,
            "unit": selected_price_orm.unit,
            "unit_count": selected_price_orm.unit_count,
        }

        if selected_price_orm.tiers:
            price_info_data["tiers"] = [TierInfo.model_validate(t).model_dump(mode='json') for t in selected_price_orm.tiers]
        else:
            price_info_data["amount"] = selected_price_orm.amount

        return PriceInfo(**price_info_data)

    async def invalidate_price_cache(self, feature_id: int, currency: Optional[Currency] = None):
        """
        [CRITICAL CHANGE] 当价格变更时，必须调用此方法来清除缓存。
        如果 currency 为 None，则清除所有货币的缓存。
        """
        if currency:
            cache_key = self._get_cache_key(feature_id, currency)
            await self.redis.delete_key(cache_key)
        else:
            # Wildcard deletion for all currencies of this feature
            await self.redis.delete_by_prefix(f"{self._CACHE_PREFIX}{feature_id}:*")

    async def preload_all_prices_to_cache(self):
        """[IMPROVEMENT] 应用启动时预加载所有活跃的按量产品价格到缓存。"""
        # (略) 这会是一个后台任务，遍历所有 Feature，然后调用 get_price