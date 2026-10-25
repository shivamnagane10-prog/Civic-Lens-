import os
import sqlite3

def migrate_file(db_path):
    if not os.path.exists(db_path):
        return
    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('PRAGMA table_info(cctv_detections)')
    cols = [r[1] for r in cursor.fetchall()]
    print('Existing cols in cctv_detections:', cols)

    new_cols = [
        ('model_name', 'VARCHAR(100) DEFAULT "CivicLens-MultiVision-v2.2"'),
        ('model_version', 'VARCHAR(30) DEFAULT "2.2.0"'),
        ('bounding_box', 'TEXT'),
        ('is_restricted', 'BOOLEAN DEFAULT 0'),
        ('validation_metrics', 'TEXT')
    ]

    for col_name, col_type in new_cols:
        if col_name not in cols:
            print(f'Adding column {col_name}...')
            cursor.execute(f'ALTER TABLE cctv_detections ADD COLUMN {col_name} {col_type}')

    conn.commit()
    conn.close()
    print(f"Finished {db_path}")

def migrate():
    migrate_file('civiclens.db')
    migrate_file('apps/api/civiclens.db')

if __name__ == '__main__':
    migrate()
