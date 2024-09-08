from dotenv import load_dotenv
import os # Used to use variables in the `.env` file
import requests

load_dotenv()

while True:
    method = input("RESTful Method (GET, POST): ")
    if method in ["GET", "POST"]:
        break
    else:
        print("Unsupported")
        
authkey = os.getenv("AVC_AUTHKEY")

if method == "POST":
    chatid = input("ChatID: ")
    params = {"avc_authkey": authkey, "chat_id": chatid}
else:
    params = {"avc_authkey": authkey}
    
response = requests.request(method, "https://appverifycode.onrender.com/api/otpVerification", params=params)

if response.status_code == 200:
    data = response.json()
    
    if method == "POST":
        verification_code = data.get("verificationCode")
        if verification_code is None:
            print("Error: 'verificationCode' not found in the response.")
        else:
            while True:
                usr_verifycode = int(input("Verification Code: "))
                
                if usr_verifycode == verification_code:
                    print("Verification Code correct")
                    break
                else:
                    print("Verification Code incorrect. Try again")
    else:
        for key, value in data.items():
            if isinstance(value, dict):
                var_name = key
                vars_list = ', '.join(value.keys())
                print(f"{var_name} = [{vars_list}]")
                for subkey, subvalue in value.items():
                    print(f"{subkey} = {subvalue}")
            else:
                print(f"{key} = {value}")
else:
    print(f"Error: {response.status_code}")