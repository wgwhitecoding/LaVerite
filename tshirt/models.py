# tshirt/models.py

from django.db import models
from django.contrib.auth.models import User

class Design(models.Model):
    """
    A user's design: which product is chosen, color, date created, etc.
    """
    PRODUCT_CHOICES = [
        ('tshirt', 'T-Shirt'),
        ('baggy', 'Baggy'),
        ('hoodie', 'Hoodie'),
        ('jumper', 'Jumper'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    product = models.CharField(max_length=20, choices=PRODUCT_CHOICES, default='tshirt')
    color = models.CharField(max_length=7, default='#ffffff')  # Store hex color
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Design {self.id} by {self.user or 'Anon'} ({self.product}, {self.color})"

class DesignDecal(models.Model):
    """
    Each image decal "stuck" on the product.
    Stores position, orientation, and size for DecalGeometry.
    """
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name='decals')
    image = models.FileField(upload_to='decals/', null=True, blank=True)  # Changed from URLField to FileField and made nullable
    # Intersection point in 3D
    pos_x = models.FloatField()
    pos_y = models.FloatField()
    pos_z = models.FloatField()
    # Orientation (Euler angles) for the decal
    rot_x = models.FloatField()
    rot_y = models.FloatField()
    rot_z = models.FloatField()
    # Decal size (width, height, depth)
    size_x = models.FloatField(default=0.5)
    size_y = models.FloatField(default=0.5)
    size_z = models.FloatField(default=0.5)

    def __str__(self):
        return f"Decal {self.id} for Design {self.design.id}"

class DesignText(models.Model):
    """
    Each text block placed on the product.
    Stores text content, color, position, rotation, scale, etc.
    Uses plane geometry for text.
    """
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name='texts')
    content = models.CharField(max_length=200)
    color = models.CharField(max_length=7, default='#000000')
    # Transform in 3D
    pos_x = models.FloatField()
    pos_y = models.FloatField()
    pos_z = models.FloatField()
    rot_x = models.FloatField()
    rot_y = models.FloatField()
    rot_z = models.FloatField()
    scale_x = models.FloatField(default=1.0)
    scale_y = models.FloatField(default=1.0)
    scale_z = models.FloatField(default=1.0)

    def __str__(self):
        return f"Text '{self.content}' for Design {self.design.id}"




