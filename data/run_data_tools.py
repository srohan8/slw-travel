import subprocess

print("🔁 Running route converter...")
subprocess.run(["python", "convert_to_json.py"])

print("🌍 Running external city sync...")
subprocess.run(["python", "sync_nominatim.py"])

print("✅ All tools finished.")
