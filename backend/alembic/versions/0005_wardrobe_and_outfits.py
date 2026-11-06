"""Create wardrobe items, outfits, and outfit items tables.

Revision ID: 0005_wardrobe_and_outfits
Revises: 0004_orders_and_checkout
Create Date: 2026-11-06 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_wardrobe_and_outfits'
down_revision: Union[str, None] = '0004_orders_and_checkout'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. wardrobe_items table
    op.create_table(
        'wardrobe_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('product_id', sa.String(length=36), nullable=True),
        sa.Column('order_item_id', sa.String(length=36), nullable=True),
        sa.Column('source', sa.String(length=32), server_default='manual', nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('brand', sa.String(length=100), server_default='DRAPE Atelier', nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('subcategory', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=100), nullable=False),
        sa.Column('secondary_color', sa.String(length=100), nullable=True),
        sa.Column('size', sa.String(length=50), nullable=True),
        sa.Column('material', sa.String(length=255), nullable=True),
        sa.Column('season', sa.String(length=50), nullable=True),
        sa.Column('occasion', sa.String(length=50), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('purchase_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_item_id', name='uq_wardrobe_items_order_item_id'),
    )
    op.create_index('ix_wardrobe_items_user_id', 'wardrobe_items', ['user_id'], unique=False)
    op.create_index('ix_wardrobe_items_product_id', 'wardrobe_items', ['product_id'], unique=False)
    op.create_index('ix_wardrobe_items_order_item_id', 'wardrobe_items', ['order_item_id'], unique=True)
    op.create_index('ix_wardrobe_items_source', 'wardrobe_items', ['source'], unique=False)
    op.create_index('ix_wardrobe_items_category', 'wardrobe_items', ['category'], unique=False)
    op.create_index('ix_wardrobe_items_color', 'wardrobe_items', ['color'], unique=False)
    op.create_index('ix_wardrobe_items_season', 'wardrobe_items', ['season'], unique=False)
    op.create_index('ix_wardrobe_items_occasion', 'wardrobe_items', ['occasion'], unique=False)

    # 2. outfits table
    op.create_table(
        'outfits',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('occasion', sa.String(length=50), nullable=True),
        sa.Column('season', sa.String(length=50), nullable=True),
        sa.Column('cover_image_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_outfits_user_id', 'outfits', ['user_id'], unique=False)

    # 3. outfit_items table
    op.create_table(
        'outfit_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('outfit_id', sa.String(length=36), nullable=False),
        sa.Column('wardrobe_item_id', sa.String(length=36), nullable=False),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['outfit_id'], ['outfits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['wardrobe_item_id'], ['wardrobe_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('outfit_id', 'wardrobe_item_id', name='uq_outfit_wardrobe_item'),
    )
    op.create_index('ix_outfit_items_outfit_id', 'outfit_items', ['outfit_id'], unique=False)
    op.create_index('ix_outfit_items_wardrobe_item_id', 'outfit_items', ['wardrobe_item_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_outfit_items_wardrobe_item_id', table_name='outfit_items')
    op.drop_index('ix_outfit_items_outfit_id', table_name='outfit_items')
    op.drop_table('outfit_items')

    op.drop_index('ix_outfits_user_id', table_name='outfits')
    op.drop_table('outfits')

    op.drop_index('ix_wardrobe_items_occasion', table_name='wardrobe_items')
    op.drop_index('ix_wardrobe_items_season', table_name='wardrobe_items')
    op.drop_index('ix_wardrobe_items_color', table_name='wardrobe_items')
    op.drop_index('ix_wardrobe_items_category', table_name='wardrobe_items')
    op.drop_index('ix_wardrobe_items_source', table_name='wardrobe_items')
    op.drop_index('ix_wardrobe_items_order_item_id', table_name='wardrobe_items')
    op.drop_index('ix_wardrobe_items_product_id', table_name='wardrobe_items')
    op.drop_index('ix_wardrobe_items_user_id', table_name='wardrobe_items')
    op.drop_table('wardrobe_items')

