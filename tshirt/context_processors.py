from django.db.models import Sum 
from .models import Cart, CartItem  # Import your models

def cart_item_count(request):
    """
    Adds the cart item count to the context for the navbar.
    """
    if request.user.is_authenticated:
        cart = Cart.objects.filter(user=request.user).first()
    else:
        session_id = request.session.session_key
        if not session_id:
            request.session.create()
        cart = Cart.objects.filter(session_id=request.session.session_key).first()

    if cart:
        return {
            "cart_item_count": cart.items.aggregate(total_items=Sum('quantity'))['total_items'] or 0
        }
    return {"cart_item_count": 0}

