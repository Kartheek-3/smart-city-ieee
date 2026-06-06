import h5py
import json
import os

model_path = 'traffic_transformer.h5'

def clean_config(d):
    if isinstance(d, dict):
        d.pop('use_gate', None)
        d.pop('quantization_config', None)
        for k, v in d.items():
            clean_config(v)
    elif isinstance(d, list):
        for v in d:
            clean_config(v)

print("Fixing h5 file...")
with h5py.File(model_path, 'r+') as f:
    if 'model_config' in f.attrs:
        model_config_str = f.attrs['model_config']
        if isinstance(model_config_str, bytes):
            model_config_str = model_config_str.decode('utf-8')
        
        model_config = json.loads(model_config_str)
        clean_config(model_config)
        
        f.attrs['model_config'] = json.dumps(model_config).encode('utf-8')
        print("Successfully removed incompatible Keras 2 kwargs from model_config!")
    else:
        print("No model_config found in h5 attrs.")
