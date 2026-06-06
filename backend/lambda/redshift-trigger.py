import json
import psycopg2
import os
from datetime import datetime

# Redshift Configuration
REDSHIFT_HOST = os.environ.get('REDSHIFT_HOST', 'smart-city-analytics.xxxxxx.us-east-1.redshift.amazonaws.com')
REDSHIFT_PORT = os.environ.get('REDSHIFT_PORT', '5439')
REDSHIFT_DB = os.environ.get('REDSHIFT_DB', 'smartcitydb')
REDSHIFT_USER = os.environ.get('REDSHIFT_USER', 'awsuser')
REDSHIFT_PASSWORD = os.environ.get('REDSHIFT_PASSWORD', 'SecurePass123!')

def get_db_connection():
    return psycopg2.connect(
        dbname=REDSHIFT_DB,
        user=REDSHIFT_USER,
        password=REDSHIFT_PASSWORD,
        host=REDSHIFT_HOST,
        port=REDSHIFT_PORT
    )

def lambda_handler(event, context):
    print(f"Received {len(event['Records'])} records from DynamoDB Streams")
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for record in event['Records']:
            if record['eventName'] == 'INSERT':
                new_image = record['dynamodb']['NewImage']
                
                # Determine table source based on the stream ARN or attributes
                # Here we use attributes to infer the type
                if 'type' in new_image:
                    item_type = new_image['type']['S']
                    
                    if item_type == 'Accident':
                        report_id = new_image['reportId']['S']
                        location = new_image['location']['S']
                        severity = new_image.get('severity', {}).get('S', 'Medium')
                        timestamp = new_image.get('timestamp', {}).get('S', datetime.utcnow().isoformat())
                        
                        cursor.execute(
                            "INSERT INTO accidents (report_id, location, severity, timestamp) VALUES (%s, %s, %s, %s)",
                            (report_id, location, severity, timestamp)
                        )
                    
                    elif item_type == 'Crime':
                        report_id = new_image['reportId']['S']
                        crime_type = new_image.get('crimeType', {}).get('S', 'General')
                        location = new_image['location']['S']
                        timestamp = new_image.get('timestamp', {}).get('S', datetime.utcnow().isoformat())
                        
                        cursor.execute(
                            "INSERT INTO crimes (report_id, crime_type, location, timestamp) VALUES (%s, %s, %s, %s)",
                            (report_id, crime_type, location, timestamp)
                        )
                        
                    elif item_type == 'SmartCity-WasteReports':
                        report_id = new_image['reportId']['S']
                        severity = new_image.get('severity', {}).get('S', 'low')
                        location = new_image['location']['S']
                        timestamp = new_image.get('timestamp', {}).get('S', datetime.utcnow().isoformat())
                        
                        cursor.execute(
                            "INSERT INTO waste_reports (report_id, severity, location, timestamp) VALUES (%s, %s, %s, %s)",
                            (report_id, severity, location, timestamp)
                        )
                        
                # Handle Food Donations (might not have 'type' attribute, check donation_id)
                elif 'food_type' in new_image and 'quantity' in new_image:
                    donation_id = new_image.get('donation_id', {}).get('S', 'N/A')
                    quantity = int(new_image['quantity']['N']) if 'N' in new_image['quantity'] else int(new_image['quantity']['S'])
                    location = new_image['location']['S']
                    timestamp = datetime.utcnow().isoformat()
                    
                    cursor.execute(
                        "INSERT INTO food_donations (donation_id, quantity, location, timestamp) VALUES (%s, %s, %s, %s)",
                        (donation_id, quantity, location, timestamp)
                    )

        conn.commit()
        print("Successfully ingested records into Redshift")
        return {"statusCode": 200, "body": json.dumps("Success")}
        
    except Exception as e:
        print(f"Error ingesting to Redshift: {e}")
        return {"statusCode": 500, "body": json.dumps(str(e))}
    finally:
        if conn:
            conn.close()
