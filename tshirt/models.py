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
    color = models.CharField(max_length=7, default='#ffffff')  # store hex color
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Design {self.id} by {self.user or 'Anon'} ({self.product}, {self.color})"

class DesignDecal(models.Model):
    """
    Each image decal "stuck" on the product.
    For DecalGeometry, store the position, orientation, and size used.
    """
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name='decals')
    image_url = models.URLField()  # or store the actual file; up to you
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

class DesignText(models.Model):
    """
    Each text block placed on the product.
    We store the text content, color, position, rotation, scale, etc.
    (We'll use a plane geometry for text.)
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
    scale_x = models.FloatField()
    scale_y = models.FloatField()
    scale_z = models.FloatField()

