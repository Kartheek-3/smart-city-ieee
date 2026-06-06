import os
import zipfile

def package_backend():
    print("📦 Packaging backend for AWS Elastic Beanstalk...")
    zip_name = 'smartcity-backend.zip'
    
    # Remove existing zip if it exists
    if os.path.exists(zip_name):
        os.remove(zip_name)
        
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add root files
        root_files = ['run.py', 'Procfile']
        for file in root_files:
            if os.path.exists(file):
                zipf.write(file)
                print(f"Added {file}")
            else:
                print(f"Warning: {file} not found!")

        # Use the lean requirements file for EB (excludes TensorFlow/PyTorch)
        if os.path.exists('requirements-eb.txt'):
            zipf.write('requirements-eb.txt', 'requirements.txt')
            print("Added requirements-eb.txt as requirements.txt")
        elif os.path.exists('requirements.txt'):
            zipf.write('requirements.txt')
            print("Added requirements.txt")

        # Add app directory recursively
        for root, dirs, files in os.walk('app'):
            # Skip python cache
            if '__pycache__' in root:
                continue
            for file in files:
                if file.endswith('.pyc'):
                    continue
                file_path = os.path.join(root, file)
                zipf.write(file_path)
                
        print("Added app/ directory")
        
    print(f"\nSuccessfully created {zip_name}!")
    print("You can upload this file directly to AWS Elastic Beanstalk.")

if __name__ == "__main__":
    package_backend()
