import joblib
import json
import numpy as np
import os

def model_fn(model_dir):
    model_path = os.path.join(model_dir, "fake_report_model.pkl")
    return joblib.load(model_path)

def input_fn(request_body, content_type):
    if content_type == 'application/json':
        data = json.loads(request_body)
        return np.array(data)
    raise ValueError(f"Unsupported content type: {content_type}")

def predict_fn(input_data, model):
    return model.predict_proba(input_data)

def output_fn(prediction, accept):
    if accept == 'application/json':
        return json.dumps(prediction.tolist())
    raise ValueError(f"Unsupported accept type: {accept}")
