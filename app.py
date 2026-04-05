from flask import Flask, request, jsonify
from flask_cors import CORS
from energy_management import run_planner, DEVICES
import traceback

app = Flask(__name__)
CORS(app)

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify({"devices": DEVICES})

@app.route("/api/plan", methods=["POST"])
def plan():
    data = request.json
    custom_s0 = data.get("initial_state") if data else None
    if custom_s0:
        custom_s0 = tuple(float(x) for x in custom_s0)
    try:
        res = run_planner(custom_s0)
        return jsonify(res)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e), "trace": traceback.format_exc()})

if __name__ == "__main__":
    app.run(debug=True, port=8000)
