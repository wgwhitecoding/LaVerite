from django.db import models

class TShirt(models.Model):
    COLOUR_CHOICES = [
        ('white', 'White'),
        ('black', 'Black'),
        ('red', 'Red'),
        ('blue', 'Blue'),
        ('green', 'Green'),
    ]

    QUALITY_CHOICES = [
        ('standard', 'Standard'),
        ('premium', 'Premium'),
    ]

    colour = models.CharField(max_length=20, choices=COLOUR_CHOICES, default='white')
    quality = models.CharField(max_length=20, choices=QUALITY_CHOICES, default='standard')
    custom_print = models.ImageField(upload_to='prints/', null=True, blank=True)

    def __str__(self):
        return f"T-Shirt ({self.colour}, {self.quality})"
