# tshirt/views.py

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import json

from .models import Design, DesignDecal, DesignText

def home(request):
    """
    Renders the home page with the customization UI.
    The front-end JS may call /load_design/ and /save_design/.
    """
    return render(request, 'home.html')

@csrf_exempt  # Remove this decorator in production for security
def upload_decal(request):
    """
    Endpoint to handle file uploads (multipart/form-data).
    Saves the file in MEDIA_ROOT/decals/ and returns the file URL.
    """
    if request.method == 'POST':
        file_obj = request.FILES.get('decalFile', None)
        if not file_obj:
            return JsonResponse({'error': 'No file uploaded'}, status=400)

        # Validate file type
        import imghdr
        file_type = imghdr.what(file_obj)
        if file_type not in ['jpeg', 'png', 'gif', 'bmp']:
            return JsonResponse({'error': 'Invalid file type'}, status=400)

        # Secure the file name
        file_name = default_storage.get_available_name(file_obj.name)
        save_path = os.path.join('decals', file_name)

        # Save the file
        saved_path = default_storage.save(save_path, ContentFile(file_obj.read()))
        file_url = default_storage.url(saved_path)  # e.g., /media/decals/filename.png

        return JsonResponse({'status': 'ok', 'file_url': file_url})

    return JsonResponse({'error': 'Invalid request'}, status=400)

@csrf_exempt  # Remove this decorator in production for security
def save_design(request):
    """
    POST endpoint to save the user's design data.
    If logged in, saves to the database.
    If anonymous, saves to the session.
    Expects JSON with:
      - product (tshirt, baggy, hoodie, jumper)
      - color (e.g. #ffffff)
      - decals: each with imageUrl, pos, rot, size
      - texts: each with content, color, pos, rot, scale
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # If user is authenticated, save to DB
        if request.user.is_authenticated:
            product = data.get('product', 'tshirt')
            color = data.get('color', '#ffffff')

            # Create a new Design
            design = Design.objects.create(
                user=request.user,
                product=product,
                color=color
            )

            # Save decals
            decals = data.get('decals', [])
            for d in decals:
                # Convert imageUrl to relative path if using FileField
                image_url = d.get('imageUrl', '')
                if image_url.startswith('/media/'):
                    image_relative_path = image_url.replace('/media/', '', 1)
                else:
                    image_relative_path = image_url  # Adjust as needed

                DesignDecal.objects.create(
                    design=design,
                    image=image_relative_path,  # Assuming imageUrl starts with /media/
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

            # Save texts
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

        else:
            # Anonymous user: save to session
            request.session['temp_design'] = data
            return JsonResponse({'status': 'session_saved'})

    return JsonResponse({'error': 'Invalid request'}, status=400)

def load_design(request):
    """
    GET endpoint to load the user's design.
    If authenticated, loads from DB.
    If anonymous, loads from session.
    Returns JSON with:
      - product
      - color
      - decals: list of decals
      - texts: list of texts
    """
    if request.user.is_authenticated:
        # Load the latest design by the user
        design = Design.objects.filter(user=request.user).order_by('-created_at').first()
        if not design:
            return JsonResponse({'status': 'no_design', 'error': 'No design found'}, status=200)

        # Prepare JSON data
        data = {
            'product': design.product,
            'color': design.color,
            'decals': [],
            'texts': []
        }

        for decal in design.decals.all():
            data['decals'].append({
                'imageUrl': decal.image.url if decal.image else '',
                'position': {'x': decal.pos_x, 'y': decal.pos_y, 'z': decal.pos_z},
                'rotation': {'x': decal.rot_x, 'y': decal.rot_y, 'z': decal.rot_z},
                'size': {'x': decal.size_x, 'y': decal.size_y, 'z': decal.size_z},
                'name': f'Decal {decal.id}'
            })

        for text in design.texts.all():
            data['texts'].append({
                'content': text.content,
                'color': text.color,
                'position': {'x': text.pos_x, 'y': text.pos_y, 'z': text.pos_z},
                'rotation': {'x': text.rot_x, 'y': text.rot_y, 'z': text.rot_z},
                'scale': {'x': text.scale_x, 'y': text.scale_y, 'z': text.scale_z},
                'name': f'Text {text.id}'
            })

        return JsonResponse({'status': 'ok', 'design': data}, status=200)

    else:
        # Anonymous user: load from session
        temp_design = request.session.get('temp_design')
        if not temp_design:
            return JsonResponse({'status': 'no_design', 'error': 'No design in session'}, status=200)

        return JsonResponse({'status': 'ok', 'design': temp_design}, status=200)






