import psycopg2
import os

# Configuration (Replace with actual cluster details when provisioned in AWS Console)
# Redshift clusters usually take ~15 minutes to provision.
REDSHIFT_HOST = os.environ.get('REDSHIFT_HOST', 'smart-city-analytics.xxxxxx.us-east-1.redshift.amazonaws.com')
REDSHIFT_PORT = os.environ.get('REDSHIFT_PORT', '5439')
REDSHIFT_DB = os.environ.get('REDSHIFT_DB', 'smartcitydb')
REDSHIFT_USER = os.environ.get('REDSHIFT_USER', 'awsuser')
REDSHIFT_PASSWORD = os.environ.get('REDSHIFT_PASSWORD', 'SecurePass123!')

def setup_tables():
    print("Connecting to Amazon Redshift...")
    try:
        conn = psycopg2.connect(
            dbname=REDSHIFT_DB,
            user=REDSHIFT_USER,
            password=REDSHIFT_PASSWORD,
            host=REDSHIFT_HOST,
            port=REDSHIFT_PORT
        )
        cursor = conn.cursor()

        print("Connected! Creating Analytics Tables...")

        # 1. Accidents Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS accidents (
                report_id VARCHAR(50),
                location VARCHAR(255),
                severity VARCHAR(20),
                timestamp TIMESTAMP
            );
        """)
        print("✅ Created table: accidents")

        # 2. Crimes Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS crimes (
                report_id VARCHAR(50),
                crime_type VARCHAR(100),
                location VARCHAR(255),
                timestamp TIMESTAMP
            );
        """)
        print("✅ Created table: crimes")

        # 3. Waste Reports Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS waste_reports (
                report_id VARCHAR(50),
                severity VARCHAR(20),
                location VARCHAR(255),
                timestamp TIMESTAMP
            );
        """)
        print("✅ Created table: waste_reports")

        # 4. Food Donations Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS food_donations (
                donation_id VARCHAR(50),
                quantity INTEGER,
                location VARCHAR(255),
                timestamp TIMESTAMP
            );
        """)
        print("✅ Created table: food_donations")

        conn.commit()
        cursor.close()
        conn.close()
        print("🎉 Redshift Analytics Tables Setup Complete!")

    except Exception as e:
        print(f"Error connecting to Redshift: {e}")
        print("\nNOTE: Since Redshift costs $ and takes 15 mins to provision, the backend API is configured")
        print("to use Simulation Mode for the IEEE Graphs. Once you provision the cluster in AWS, update")
        print("the REDSHIFT_HOST in this script!")

if __name__ == "__main__":
    setup_tables()
