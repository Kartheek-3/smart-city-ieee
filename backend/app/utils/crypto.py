import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# Use an environment variable or a secure default for student project purposes
# In a real production environment, this should be injected securely via AWS KMS
AES_KEY = os.environ.get('AES_SECRET_KEY', 'smartcity_secure_key_2026_32bytes').encode('utf-8')[:32]
if len(AES_KEY) < 32:
    AES_KEY = AES_KEY.ljust(32, b'x')

def encrypt_data(plaintext_str: str) -> str:
    """
    Encrypts sensitive PII (like location coordinates or personal names)
    using AES-256-CBC before saving to the database or cloud.
    """
    if not plaintext_str:
        return ""
    
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plaintext_str.encode('utf-8')) + padder.finalize()
    
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    
    # Store IV with the ciphertext for decryption
    return base64.b64encode(iv + ciphertext).decode('utf-8')

def decrypt_data(encrypted_str: str) -> str:
    """
    Decrypts AES-256 encrypted data.
    """
    if not encrypted_str:
        return ""
    
    try:
        raw_data = base64.b64decode(encrypted_str)
        iv = raw_data[:16]
        ciphertext = raw_data[16:]
        
        cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        unpadder = padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
        
        return plaintext.decode('utf-8')
    except Exception as e:
        print(f"Decryption failed: {e}")
        return "[Decryption Error]"
