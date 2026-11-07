"""Add wear logs, wear log items, outfit plans, and rotation strategy to stylist preferences.

Revision ID: 0007_wear_logs_and_planner
Revises: 0006_stylist_preferences
Create Date: 2026-11-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007_wear_logs_and_planner'
down_revision: Union[str, None] = '0006_stylist_preferences'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. outfit_plans table
    op.create_table(
        'outfit_plans',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('plan_date', sa.Date(), nullable=False),
        sa.Column('outfit_id', sa.String(length=36), nullable=True),
        sa.Column('occasion', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), server_default='planned', nullable=False),
        sa.Column('items', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['outfit_id'], ['outfits.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_outfit_plans_user_id', 'outfit_plans', ['user_id'], unique=False)
    op.create_index('ix_outfit_plans_plan_date', 'outfit_plans', ['plan_date'], unique=False)
    op.create_index('ix_outfit_plans_status', 'outfit_plans', ['status'], unique=False)
    op.create_index('ix_outfit_plans_outfit_id', 'outfit_plans', ['outfit_id'], unique=False)

    # 2. wear_logs table
    op.create_table(
        'wear_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('wear_date', sa.Date(), nullable=False),
        sa.Column('outfit_id', sa.String(length=36), nullable=True),
        sa.Column('occasion', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['outfit_id'], ['outfits.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_wear_logs_user_id', 'wear_logs', ['user_id'], unique=False)
    op.create_index('ix_wear_logs_wear_date', 'wear_logs', ['wear_date'], unique=False)
    op.create_index('ix_wear_logs_outfit_id', 'wear_logs', ['outfit_id'], unique=False)

    # 3. wear_log_items table
    op.create_table(
        'wear_log_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('wear_log_id', sa.String(length=36), nullable=False),
        sa.Column('wardrobe_item_id', sa.String(length=36), nullable=True),
        sa.Column('product_id', sa.String(length=36), nullable=True),
        sa.Column('garment_name_snapshot', sa.String(length=255), nullable=False),
        sa.Column('category_snapshot', sa.String(length=100), nullable=False),
        sa.Column('color_snapshot', sa.String(length=100), nullable=False),
        sa.Column('image_url_snapshot', sa.String(length=500), nullable=True),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['wardrobe_item_id'], ['wardrobe_items.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['wear_log_id'], ['wear_logs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_wear_log_items_wear_log_id', 'wear_log_items', ['wear_log_id'], unique=False)
    op.create_index('ix_wear_log_items_wardrobe_item_id', 'wear_log_items', ['wardrobe_item_id'], unique=False)

    # 4. stylist_preferences additions
    op.add_column(
        'stylist_preferences',
        sa.Column('rotation_strategy', sa.String(length=32), server_default='balanced', nullable=False),
    )
    op.add_column(
        'stylist_preferences',
        sa.Column('inferred_favorites', sa.JSON(), server_default='{}', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('stylist_preferences', 'inferred_favorites')
    op.drop_column('stylist_preferences', 'rotation_strategy')

    op.drop_index('ix_wear_log_items_wardrobe_item_id', table_name='wear_log_items')
    op.drop_index('ix_wear_log_items_wear_log_id', table_name='wear_log_items')
    op.drop_table('wear_log_items')

    op.drop_index('ix_wear_logs_outfit_id', table_name='wear_logs')
    op.drop_index('ix_wear_logs_wear_date', table_name='wear_logs')
    op.drop_index('ix_wear_logs_user_id', table_name='wear_logs')
    op.drop_table('wear_logs')

    op.drop_index('ix_outfit_plans_outfit_id', table_name='outfit_plans')
    op.drop_index('ix_outfit_plans_plan_date', table_name='outfit_plans')
    op.drop_index('ix_outfit_plans_status', table_name='outfit_plans')
    op.drop_index('ix_outfit_plans_user_id', table_name='outfit_plans')
    op.drop_table('outfit_plans')

