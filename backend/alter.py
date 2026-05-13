import sqlite3

conn = sqlite3.connect('portfolio.db')
c = conn.cursor()

try:
    c.execute('ALTER TABLE user_settings ADD COLUMN theme VARCHAR DEFAULT "dark"')
except Exception as e:
    print(e)
    
try:
    c.execute('ALTER TABLE user_settings ADD COLUMN shadow_investor_watchlist VARCHAR')
except Exception as e:
    print(e)
    
try:
    c.execute('ALTER TABLE user_settings ADD COLUMN shadow_signal_threshold INTEGER DEFAULT 20')
except Exception as e:
    print(e)

conn.commit()
conn.close()
