from django.contrib import admin
from .models import Design, DesignDecal, DesignText

@admin.register(Design)
class DesignAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'product', 'color', 'created_at']
    list_filter = ['product', 'color']
    search_fields = ['user__username']

@admin.register(DesignDecal)
class DesignDecalAdmin(admin.ModelAdmin):
    list_display = ['id', 'design', 'image_url', 'pos_x', 'pos_y', 'pos_z']
    list_filter = ['design__product']
    search_fields = ['image_url']

@admin.register(DesignText)
class DesignTextAdmin(admin.ModelAdmin):
    list_display = ['id', 'design', 'content', 'color', 'pos_x', 'pos_y', 'pos_z']
    list_filter = ['design__product']
    search_fields = ['content']


