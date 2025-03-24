from flask import Flask, request, jsonify
import pickle

app = Flask(__name__)
with open('cicids_model.pkl', 'rb') as file:
    cicids_model = pickle.load(file)
with open('cicddos_model.pkl', 'rb') as file:
    cicddos_model = pickle.load(file)
@app.route('/classify', methods=['POST'])
def classify():
    data = request.json
    input_data = data['input']  # Assume input data is passed as a key 'input'

    # Example classification logic
    if isinstance(input_data, str):  # Example condition for model selection
        result = cicids_model.predict([input_data])
    else:
        result = cicddos_model.predict([input_data])

    return jsonify({'classification': result[0]})

if __name__ == '__main__':
    app.run(port=5000)