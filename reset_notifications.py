import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Delete the notifications migration records
cursor.execute("DELETE FROM django_migrations WHERE app = 'notifications';")

conn.commit()
conn.close()

print("Deleted notifications migrations from database.")
