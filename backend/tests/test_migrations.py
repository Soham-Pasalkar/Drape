"""
DRAPE Alembic Migration Test Suite.

Verifies:
1. Complete migration upgrade from baseline to head.
2. Complete rollback from head to 0001_initial_baseline.
3. Re-upgrade from baseline back to head.
4. Schema consistency and constraint preservation.
"""

import os
import tempfile
import pytest
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect


def test_alembic_migrations_upgrade_and_downgrade_cycle():
    """Executes a full upgrade -> downgrade -> upgrade cycle on SQLite."""
    # Create isolated temporary sqlite file for migration verification
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        db_path = tmp_db.name

    try:
        sqlite_url = f"sqlite:///{db_path}"

        alembic_cfg_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
        )
        alembic_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "alembic")
        )
        alembic_cfg = Config(alembic_cfg_path)
        alembic_cfg.set_main_option("script_location", alembic_dir)
        alembic_cfg.set_main_option("sqlalchemy.url", sqlite_url)

        # 1. Upgrade from scratch to head
        command.upgrade(alembic_cfg, "head")

        # Inspect tables created
        engine = create_engine(sqlite_url)
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        assert "users" in tables
        assert "user_consents" in tables
        assert "user_sessions" in tables
        assert "products" in tables
        assert "product_images" in tables
        assert "product_variants" in tables
        assert "inventory" in tables
        assert "carts" in tables
        assert "cart_items" in tables
        assert "addresses" in tables
        assert "orders" in tables
        assert "order_items" in tables
        assert "payments" in tables
        assert "order_status_history" in tables
        assert "wardrobe_items" in tables
        assert "outfits" in tables
        assert "outfit_items" in tables

        # Verify columns on users & products & orders
        user_cols = {col["name"]: col for col in inspector.get_columns("users")}
        assert "id" in user_cols
        assert "email" in user_cols
        assert "hashed_password" in user_cols
        assert "is_active" in user_cols
        assert "roles" in user_cols

        order_cols = {col["name"]: col for col in inspector.get_columns("orders")}
        assert "id" in order_cols
        assert "order_number" in order_cols
        assert "guest_token" in order_cols
        assert "total_amount" in order_cols
        assert "status" in order_cols
        assert "shipping_address_snapshot" in order_cols

        product_cols = {col["name"]: col for col in inspector.get_columns("products")}
        assert "id" in product_cols
        assert "slug" in product_cols
        assert "price" in product_cols
        assert "category" in product_cols
        assert "model_3d_url" in product_cols
        assert "try_on_enabled" in product_cols

        # Verify M4 Wardrobe & Outfits schema
        # 1. wardrobe_items: columns, nullability, foreign keys, indexes, unique constraints
        wardrobe_cols = {col["name"]: col for col in inspector.get_columns("wardrobe_items")}
        for col_name in [
            "id", "user_id", "product_id", "order_item_id", "source", "name",
            "brand", "category", "subcategory", "description", "color",
            "secondary_color", "size", "material", "season", "occasion",
            "image_url", "purchase_date", "created_at", "updated_at",
        ]:
            assert col_name in wardrobe_cols, f"Column {col_name} missing from wardrobe_items"

        assert wardrobe_cols["id"]["nullable"] is False
        assert wardrobe_cols["user_id"]["nullable"] is False
        assert wardrobe_cols["source"]["nullable"] is False
        assert wardrobe_cols["name"]["nullable"] is False
        assert wardrobe_cols["category"]["nullable"] is False
        assert wardrobe_cols["color"]["nullable"] is False
        assert wardrobe_cols["created_at"]["nullable"] is False
        assert wardrobe_cols["updated_at"]["nullable"] is False
        assert wardrobe_cols["product_id"]["nullable"] is True
        assert wardrobe_cols["order_item_id"]["nullable"] is True
        assert wardrobe_cols["brand"]["nullable"] is True
        assert wardrobe_cols["subcategory"]["nullable"] is True
        assert wardrobe_cols["description"]["nullable"] is True
        assert wardrobe_cols["secondary_color"]["nullable"] is True
        assert wardrobe_cols["size"]["nullable"] is True
        assert wardrobe_cols["material"]["nullable"] is True
        assert wardrobe_cols["season"]["nullable"] is True
        assert wardrobe_cols["occasion"]["nullable"] is True
        assert wardrobe_cols["image_url"]["nullable"] is True
        assert wardrobe_cols["purchase_date"]["nullable"] is True

        # Server defaults for wardrobe_items
        assert wardrobe_cols["source"]["default"] is not None and "manual" in wardrobe_cols["source"]["default"]
        assert wardrobe_cols["brand"]["default"] is not None and "DRAPE Atelier" in wardrobe_cols["brand"]["default"]
        assert wardrobe_cols["created_at"]["default"] is not None
        assert wardrobe_cols["updated_at"]["default"] is not None

        wardrobe_fks = inspector.get_foreign_keys("wardrobe_items")
        wardrobe_referred = {
            (fk["referred_table"], tuple(fk["constrained_columns"])): fk
            for fk in wardrobe_fks
        }
        assert ("users", ("user_id",)) in wardrobe_referred
        assert ("products", ("product_id",)) in wardrobe_referred
        assert ("order_items", ("order_item_id",)) in wardrobe_referred
        assert wardrobe_referred[("users", ("user_id",))]["options"].get("ondelete") == "CASCADE"
        assert wardrobe_referred[("products", ("product_id",))]["options"].get("ondelete") == "SET NULL"
        assert wardrobe_referred[("order_items", ("order_item_id",))]["options"].get("ondelete") == "SET NULL"

        wardrobe_indexes = {
            idx["name"]: tuple(idx["column_names"])
            for idx in inspector.get_indexes("wardrobe_items")
        }
        assert "ix_wardrobe_items_user_id" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_user_id"] == ("user_id",)
        assert "ix_wardrobe_items_product_id" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_product_id"] == ("product_id",)
        assert "ix_wardrobe_items_order_item_id" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_order_item_id"] == ("order_item_id",)
        assert "ix_wardrobe_items_source" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_source"] == ("source",)
        assert "ix_wardrobe_items_category" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_category"] == ("category",)
        assert "ix_wardrobe_items_color" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_color"] == ("color",)
        assert "ix_wardrobe_items_season" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_season"] == ("season",)
        assert "ix_wardrobe_items_occasion" in wardrobe_indexes
        assert wardrobe_indexes["ix_wardrobe_items_occasion"] == ("occasion",)

        wardrobe_uqs = [tuple(uq["column_names"]) for uq in inspector.get_unique_constraints("wardrobe_items")]
        assert ("order_item_id",) in wardrobe_uqs

        # 2. outfits: columns, nullability, foreign keys, indexes, server defaults
        outfit_cols = {col["name"]: col for col in inspector.get_columns("outfits")}
        for col_name in [
            "id", "user_id", "name", "description", "occasion",
            "season", "cover_image_url", "created_at", "updated_at",
        ]:
            assert col_name in outfit_cols, f"Column {col_name} missing from outfits"

        assert outfit_cols["id"]["nullable"] is False
        assert outfit_cols["user_id"]["nullable"] is False
        assert outfit_cols["name"]["nullable"] is False
        assert outfit_cols["created_at"]["nullable"] is False
        assert outfit_cols["updated_at"]["nullable"] is False
        assert outfit_cols["description"]["nullable"] is True
        assert outfit_cols["occasion"]["nullable"] is True
        assert outfit_cols["season"]["nullable"] is True
        assert outfit_cols["cover_image_url"]["nullable"] is True

        # Server defaults for outfits
        assert outfit_cols["created_at"]["default"] is not None
        assert outfit_cols["updated_at"]["default"] is not None

        outfit_fks = inspector.get_foreign_keys("outfits")
        outfit_referred = {
            (fk["referred_table"], tuple(fk["constrained_columns"])): fk
            for fk in outfit_fks
        }
        assert ("users", ("user_id",)) in outfit_referred
        assert outfit_referred[("users", ("user_id",))]["options"].get("ondelete") == "CASCADE"

        outfit_indexes = {
            idx["name"]: tuple(idx["column_names"])
            for idx in inspector.get_indexes("outfits")
        }
        assert "ix_outfits_user_id" in outfit_indexes
        assert outfit_indexes["ix_outfits_user_id"] == ("user_id",)

        # 3. outfit_items: columns, nullability, foreign keys, indexes, unique constraints, server defaults
        outfit_item_cols = {col["name"]: col for col in inspector.get_columns("outfit_items")}
        for col_name in ["id", "outfit_id", "wardrobe_item_id", "display_order", "created_at"]:
            assert col_name in outfit_item_cols, f"Column {col_name} missing from outfit_items"

        assert outfit_item_cols["id"]["nullable"] is False
        assert outfit_item_cols["outfit_id"]["nullable"] is False
        assert outfit_item_cols["wardrobe_item_id"]["nullable"] is False
        assert outfit_item_cols["display_order"]["nullable"] is False
        assert outfit_item_cols["created_at"]["nullable"] is False

        # Server defaults for outfit_items
        assert outfit_item_cols["display_order"]["default"] is not None and "0" in outfit_item_cols["display_order"]["default"]
        assert outfit_item_cols["created_at"]["default"] is not None

        outfit_item_fks = inspector.get_foreign_keys("outfit_items")
        outfit_item_referred = {
            (fk["referred_table"], tuple(fk["constrained_columns"])): fk
            for fk in outfit_item_fks
        }
        assert ("outfits", ("outfit_id",)) in outfit_item_referred
        assert ("wardrobe_items", ("wardrobe_item_id",)) in outfit_item_referred
        assert outfit_item_referred[("outfits", ("outfit_id",))]["options"].get("ondelete") == "CASCADE"
        assert outfit_item_referred[("wardrobe_items", ("wardrobe_item_id",))]["options"].get("ondelete") == "CASCADE"

        outfit_item_indexes = {
            idx["name"]: tuple(idx["column_names"])
            for idx in inspector.get_indexes("outfit_items")
        }
        assert "ix_outfit_items_outfit_id" in outfit_item_indexes
        assert outfit_item_indexes["ix_outfit_items_outfit_id"] == ("outfit_id",)
        assert "ix_outfit_items_wardrobe_item_id" in outfit_item_indexes
        assert outfit_item_indexes["ix_outfit_items_wardrobe_item_id"] == ("wardrobe_item_id",)

        outfit_item_uqs = [tuple(uq["column_names"]) for uq in inspector.get_unique_constraints("outfit_items")]
        assert ("outfit_id", "wardrobe_item_id") in outfit_item_uqs

        # 2. Downgrade to 0001_initial_baseline
        command.downgrade(alembic_cfg, "0001_initial_baseline")

        # Tables must have been cleanly removed
        inspector = inspect(engine)
        remaining_tables = set(inspector.get_table_names())
        assert "users" not in remaining_tables
        assert "user_consents" not in remaining_tables
        assert "user_sessions" not in remaining_tables
        assert "products" not in remaining_tables
        assert "carts" not in remaining_tables
        assert "orders" not in remaining_tables
        assert "addresses" not in remaining_tables
        assert "wardrobe_items" not in remaining_tables
        assert "outfits" not in remaining_tables
        assert "outfit_items" not in remaining_tables

        # 3. Re-upgrade to head to verify idempotency
        command.upgrade(alembic_cfg, "head")
        inspector = inspect(engine)
        recreated_tables = set(inspector.get_table_names())
        assert "users" in recreated_tables
        assert "user_consents" in recreated_tables
        assert "user_sessions" in recreated_tables
        assert "orders" in recreated_tables
        assert "addresses" in recreated_tables
        assert "wardrobe_items" in recreated_tables
        assert "outfits" in recreated_tables
        assert "outfit_items" in recreated_tables

        engine.dispose()
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
