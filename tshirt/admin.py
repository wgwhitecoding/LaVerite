# tshirt/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Design, DesignDecal, DesignText

@admin.register(Design)
class DesignAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'product', 'color', 'created_at']
    list_filter = ['product', 'color']
    search_fields = ['user__username']

@admin.register(DesignDecal)
class DesignDecalAdmin(admin.ModelAdmin):
    list_display = ['id', 'design', 'image_thumbnail', 'pos_x', 'pos_y', 'pos_z']
    list_filter = ['design__product']
    search_fields = ['image__filename']  # Adjusted for FileField

    def image_thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover; border-radius: 4px;" />', obj.image.url)
        return "-"
    image_thumbnail.short_description = 'Image'

@admin.register(DesignText)
class DesignTextAdmin(admin.ModelAdmin):
    list_display = ['id', 'design', 'content', 'color', 'pos_x', 'pos_y', 'pos_z']
    list_filter = ['design__product']
    search_fields = ['content']





