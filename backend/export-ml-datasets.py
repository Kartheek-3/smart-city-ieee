import csv
import random
import os
from datetime import datetime, timedelta

# Create ml-datasets directory
os.makedirs("ml-datasets", exist_ok=True)

def generate_traffic_dataset():
    """Traffic Prediction Dataset: Vehicle Count, Weather, Day, Hour, Traffic Level"""
    filename = "ml-datasets/traffic_prediction.csv"
    weathers = ['Clear', 'Rain', 'Fog', 'Snow', 'Cloudy']
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    with open(filename, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['VehicleCount', 'Weather', 'Day', 'Hour', 'TrafficLevel'])
        
        for _ in range(500):
            count = random.randint(50, 1500)
            weather = random.choice(weathers)
            day = random.choice(days)
            hour = random.randint(0, 23)
            
            # Simple heuristic for Traffic Level
            if count > 1000 or (hour in [8, 9, 17, 18]):
                level = 'High'
            elif count > 500:
                level = 'Medium'
            else:
                level = 'Low'
                
            writer.writerow([count, weather, day, hour, level])
    print(f"✅ Exported ML Dataset: {filename} (500 records)")

def generate_fake_report_dataset():
    """Fake Report Detection Dataset: Trust Score, Validation Count, Previous Reports, Status"""
    filename = "ml-datasets/fake_report_detection.csv"
    
    with open(filename, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['TrustScore', 'ValidationCount', 'PreviousReports', 'IsFake'])
        
        for _ in range(300):
            trust = random.randint(10, 100)
            validations = random.randint(0, 10)
            prev_reports = random.randint(0, 50)
            
            # Simple heuristic
            is_fake = 1 if trust < 40 and validations == 0 else 0
            if random.random() < 0.1: # Add some noise
                is_fake = 1 - is_fake
                
            writer.writerow([trust, validations, prev_reports, is_fake])
    print(f"✅ Exported ML Dataset: {filename} (300 records)")

def generate_crime_dataset():
    """Crime Prediction Dataset: Location, Crime Count, Population Density, Risk Level"""
    filename = "ml-datasets/crime_prediction.csv"
    locations = ['Downtown', 'North Side', 'West End', 'South Park', 'East Side']
    
    with open(filename, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Location', 'CrimeCount', 'PopulationDensity', 'RiskLevel'])
        
        for _ in range(200):
            loc = random.choice(locations)
            crime_count = random.randint(0, 25)
            density = random.randint(2000, 15000)
            
            # Heuristic
            if crime_count > 15 or density > 10000:
                risk = 'High'
            elif crime_count > 5:
                risk = 'Medium'
            else:
                risk = 'Low'
                
            writer.writerow([loc, crime_count, density, risk])
    print(f"✅ Exported ML Dataset: {filename} (200 records)")

if __name__ == "__main__":
    print("Exporting Redshift Analytics Data for Amazon SageMaker Training...\n")
    generate_traffic_dataset()
    generate_fake_report_dataset()
    generate_crime_dataset()
    print("\n🎉 ML Datasets Exported Successfully!")
