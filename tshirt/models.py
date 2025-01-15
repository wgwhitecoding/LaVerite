# tshirt/models.py

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator

class Design(models.Model):
    """
    Represents a user's design, including chosen product, color, and creation date.
    """
    PRODUCT_CHOICES = [
        ('tshirt', 'T-Shirt'),
        ('baggy', 'Baggy'),
        ('hoodie', 'Hoodie'),
        ('jumper', 'Jumper'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='designs')
    product = models.CharField(max_length=20, choices=PRODUCT_CHOICES, default='tshirt')
    color = models.CharField(
        max_length=7,
        default='#ffffff',
        validators=[
            RegexValidator(
                regex=r'^#(?:[0-9a-fA-F]{3}){1,2}$',
                message='Enter a valid hex color code.',
                code='invalid_hex_color'
            )
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),  # Index for faster lookups on user
            models.Index(fields=['product']),  # Index for filtering by product
        ]

    def __str__(self):
        return f"Design {self.id} by {self.user.username if self.user else 'Anon'} ({self.get_product_display()}, {self.color})"

class DesignDecal(models.Model):
    """
    Represents an image decal applied to a design, including its position, orientation, and size.
    """
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name='decals')
    image = models.ImageField(upload_to='decals/')
    # Position in 3D space
    pos_x = models.FloatField()
    pos_y = models.FloatField()
    pos_z = models.FloatField()
    # Rotation angles (Euler angles in radians)
    rot_x = models.FloatField()
    rot_y = models.FloatField()
    rot_z = models.FloatField()
    # Size dimensions
    size_x = models.FloatField(default=0.5)
    size_y = models.FloatField(default=0.5)
    size_z = models.FloatField(default=0.5)

    def __str__(self):
        return f"Decal {self.id} for Design {self.design.id}"

class DesignText(models.Model):
    """
    Represents a text block applied to a design, including its content, color, position, rotation, and scale.
    """
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name='texts')
    content = models.CharField(max_length=200)
    color = models.CharField(
        max_length=7,
        default='#000000',
        validators=[
            RegexValidator(
                regex=r'^#(?:[0-9a-fA-F]{3}){1,2}$',
                message='Enter a valid hex color code.',
                code='invalid_hex_color'
            )
        ]
    )
    # Position in 3D space
    pos_x = models.FloatField()
    pos_y = models.FloatField()
    pos_z = models.FloatField()
    # Rotation angles (Euler angles in radians)
    rot_x = models.FloatField()
    rot_y = models.FloatField()
    rot_z = models.FloatField()
    # Scale factors
    scale_x = models.FloatField(default=1.0)
    scale_y = models.FloatField(default=1.0)
    scale_z = models.FloatField(default=1.0)

    def __str__(self):
        return f"Text '{self.content}' for Design {self.design.id}"





