# tshirt/views.py
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

from .models import Design, DesignDecal, DesignText

def home(request):
    # Renders the home page with the customization UI
    return render(request, 'home.html')

@login_required
@csrf_exempt
def save_design(request):
    """
    POST endpoint to save the user's design data.
    We expect JSON with:
      - product (tshirt, baggy, hoodie, jumper)
      - color (e.g. #ffffff)
      - decals: each with imageUrl, pos, rot, size
      - texts: each with content, color, pos, rot, scale
    """
    if request.method == 'POST':
        data = json.loads(request.body)
        product = data.get('product', 'tshirt')
        color = data.get('color', '#ffffff')

        # Create a new Design
        design = Design.objects.create(
            user=request.user,
            product=product,
            color=color
        )

        # Save each decal
        decals = data.get('decals', [])
        for d in decals:
            DesignDecal.objects.create(
                design=design,
                image_url=d.get('imageUrl', ''),
                pos_x=d['position']['x'],
                pos_y=d['position']['y'],
                pos_z=d['position']['z'],
                rot_x=d['rotation']['x'],
                rot_y=d['rotation']['y'],
                rot_z=d['rotation']['z'],
                size_x=d['size']['x'],
                size_y=d['size']['y'],
                size_z=d['size']['z']
            )

        # Save each text item
        texts = data.get('texts', [])
        for t in texts:
            DesignText.objects.create(
                design=design,
                content=t.get('content', ''),
                color=t.get('color', '#000000'),
                pos_x=t['position']['x'],
                pos_y=t['position']['y'],
                pos_z=t['position']['z'],
                rot_x=t['rotation']['x'],
                rot_y=t['rotation']['y'],
                rot_z=t['rotation']['z'],
                scale_x=t['scale']['x'],
                scale_y=t['scale']['y'],
                scale_z=t['scale']['z']
            )

        return JsonResponse({'status': 'ok', 'design_id': design.id})

    return JsonResponse({'error': 'Invalid request'}, status=400)


