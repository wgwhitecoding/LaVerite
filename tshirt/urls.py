# tshirt/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('save_design/', views.save_design, name='save_design'),
]
