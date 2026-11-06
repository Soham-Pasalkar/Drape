"""Create catalog and shopping cart tables.

Revision ID: 0003_catalog_and_cart
Revises: 0002_customer_auth_and_consent
Create Date: 2026-11-06 04:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_catalog_and_cart'
down_revision: Union[str, None] = '0002_customer_auth_and_consent'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. products table
    op.create_table(
        'products',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('brand', sa.String(length=100), server_default='DRAPE Atelier', nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=False),
        sa.Column('material', sa.String(length=255), nullable=True),
        sa.Column('care_instructions', sa.Text(), nullable=True),
        sa.Column('featured', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('model_3d_url', sa.String(length=500), nullable=True),
        sa.Column('model_3d_format', sa.String(length=50), nullable=True),
        sa.Column('model_3d_status', sa.String(length=50), server_default='pending', nullable=True),
        sa.Column('try_on_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_slug'), 'products', ['slug'], unique=True)
    op.create_index(op.f('ix_products_category'), 'products', ['category'], unique=False)
    op.create_index(op.f('ix_products_brand'), 'products', ['brand'], unique=False)
    op.create_index(op.f('ix_products_featured'), 'products', ['featured'], unique=False)
    op.create_index(op.f('ix_products_is_active'), 'products', ['is_active'], unique=False)

    # 2. product_images table
    op.create_table(
        'product_images',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('product_id', sa.String(length=36), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('alt_text', sa.String(length=255), nullable=True),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_primary', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_images_product_id'), 'product_images', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_images_is_primary'), 'product_images', ['is_primary'], unique=False)

    # 3. product_variants table
    op.create_table(
        'product_variants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('product_id', sa.String(length=36), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=False),
        sa.Column('size', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=100), nullable=False),
        sa.Column('color_code', sa.String(length=7), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_variants_product_id'), 'product_variants', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_variants_sku'), 'product_variants', ['sku'], unique=True)
    op.create_index(op.f('ix_product_variants_size'), 'product_variants', ['size'], unique=False)
    op.create_index(op.f('ix_product_variants_color'), 'product_variants', ['color'], unique=False)

    # 4. inventory table
    op.create_table(
        'inventory',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('variant_id', sa.String(length=36), nullable=False),
        sa.Column('quantity', sa.Integer(), server_default='0', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['variant_id'], ['product_variants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_variant_id'), 'inventory', ['variant_id'], unique=True)

    # 5. carts table
    op.create_table(
        'carts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('guest_token', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_carts_user_id'), 'carts', ['user_id'], unique=True)
    op.create_index(op.f('ix_carts_guest_token'), 'carts', ['guest_token'], unique=True)

    # 6. cart_items table
    op.create_table(
        'cart_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('cart_id', sa.String(length=36), nullable=False),
        sa.Column('variant_id', sa.String(length=36), nullable=False),
        sa.Column('quantity', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['cart_id'], ['carts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['variant_id'], ['product_variants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cart_id', 'variant_id', name='uq_cart_items_cart_variant')
    )
    op.create_index(op.f('ix_cart_items_cart_id'), 'cart_items', ['cart_id'], unique=False)
    op.create_index(op.f('ix_cart_items_variant_id'), 'cart_items', ['variant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_cart_items_variant_id'), table_name='cart_items')
    op.drop_index(op.f('ix_cart_items_cart_id'), table_name='cart_items')
    op.drop_table('cart_items')

    op.drop_index(op.f('ix_carts_guest_token'), table_name='carts')
    op.drop_index(op.f('ix_carts_user_id'), table_name='carts')
    op.drop_table('carts')

    op.drop_index(op.f('ix_inventory_variant_id'), table_name='inventory')
    op.drop_table('inventory')

    op.drop_index(op.f('ix_product_variants_color'), table_name='product_variants')
    op.drop_index(op.f('ix_product_variants_size'), table_name='product_variants')
    op.drop_index(op.f('ix_product_variants_sku'), table_name='product_variants')
    op.drop_index(op.f('ix_product_variants_product_id'), table_name='product_variants')
    op.drop_table('product_variants')

    op.drop_index(op.f('ix_product_images_is_primary'), table_name='product_images')
    op.drop_index(op.f('ix_product_images_product_id'), table_name='product_images')
    op.drop_table('product_images')

    op.drop_index(op.f('ix_products_is_active'), table_name='products')
    op.drop_index(op.f('ix_products_featured'), table_name='products')
    op.drop_index(op.f('ix_products_brand'), table_name='products')
    op.drop_index(op.f('ix_products_category'), table_name='products')
    op.drop_index(op.f('ix_products_slug'), table_name='products')
    op.drop_table('products')

