# tshirt/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('', views.about_page, name='about'),  # Landing/about page
    path('create/', views.home, name='home'), 
    path('upload_decal/', views.upload_decal, name='upload_decal'),
    path('save_design/', views.save_design, name='save_design'),
    path('load_design/', views.load_design, name='load_design'),
]



