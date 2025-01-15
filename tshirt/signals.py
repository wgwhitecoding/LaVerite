from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from .models import Cart, CartItem

@receiver(user_logged_in)
def merge_cart_on_login(sender, request, user, **kwargs):
    """
    Merges the session-based cart with the user's cart upon login.
    """
    session_id = request.session.session_key
    if not session_id:
        return  # No session exists

    # Fetch session-based cart
    try:
        session_cart = Cart.objects.get(session_id=session_id)
    except Cart.DoesNotExist:
        return  # No cart to merge

    # Fetch or create the user's cart
    user_cart, created = Cart.objects.get_or_create(user=user)

    # Move items from session cart to user's cart
    for item in session_cart.items.all():
        # Check if the item already exists in the user's cart
        existing_item = user_cart.items.filter(product=item.product).first()
        if existing_item:
            # Update quantity if the item exists
            existing_item.quantity += item.quantity
            existing_item.save()
        else:
            # Transfer the item to the user's cart
            item.cart = user_cart
            item.save()

    # Delete the session-based cart after merging
    session_cart.delete()

    # Optional: Update session to reflect the user's cart
    request.session.modified = True

