---
icon: python
---

# Python

{% hint style="info" %}
Note: This is just a reference to learn how **AppVerify Code** works. For perfect and secure usage, you should use [Javascript](javascript-project.md) instead, or you can convert **Python** code below to `base64` encoded code.
{% endhint %}

In this document, I will guide you to create a project in **Python** using **AppVerify Code API** to be able to confirm whether the user entered the correct OTP code sent.

Since we are working with **APIs in Python**, we will need to use a module called `requests`, and to protect `AVC AuthKey`, we will need to use the `.env` file and import it using the `dotenv` module. To install, go to Terminal and run the commands:&#x20;

```
python -m pip install requests
python -m pip install python-dotenv
```

&#x20;(Skip if already installed).

***

First, you need to create a `.env` file to protect your `AVC AuthKey` code:

{% code title=".env" %}
```
AVC_AUTHKEY=<your-authkey>
```
{% endcode %}

Once done, we will start with the `main.py` file.

We will import the necessary modules to use at the beginning of the file:

{% code title="main.py:1" %}
```python
from dotenv import load_dotenv
import os # Used to use variables in the `.env` file
import requests
```
{% endcode %}

Next we need to have code to launch **dotenv** to be able to get data from the `.env` file.

{% code title="main.py:5" %}
```python
load_dotenv()
```
{% endcode %}

Since **AppVerify Code** only supports **two RESTful methods**, `GET` and `POST`, the machine will ask the user to choose the `GET` or `POST` method. If the user enters a value other than `GET` or `POST`, the machine will report an error and ask for re-entry:

{% code title="main.py:7" %}
```python
while True:
    method = input("RESTful Method (GET, POST): ")
    if method in ["GET", "POST"]:
        break
    else:
        print("Unsupported")
```
{% endcode %}

We will assign the `AVC AuthKey` code value in the `.env` file to the `authkey` variable:

{% code title="main.py:15" %}
```python
authkey = os.getenv("AVC_AUTHKEY")
```
{% endcode %}

The machine will ask the user for `ChatID` if the user chooses the `POST` method and sets 2 params `avc_authkey` and `chat_id`. If the user chooses the `GET` method, it will only take 1 param `avc_authkey`:

{% code title="main.py:17" %}
```python
if method == "POST":
    chatid = input("ChatID: ")
    params = {"avc_authkey": authkey, "chat_id": chatid}
else:
    params = {"avc_authkey": authkey}
```
{% endcode %}

The machine will send an API request to the **AppVerify Code** address with the method as `method` and the param as `params`:

{% code title="main.py:23" %}
```python
response = requests.request(method, "https://appverifycode.onrender.com/api/otpVerification", params=params)
```
{% endcode %}

Next, the machine will check if the response is `200`, it will parse the **JSON response data** and check if the method is `POST`, it will get the OTP code data from the `codeVerification` element in the **JSON response code**, if `codeVerification` does not exist, it will report an error. If it does, it will ask the user for the OTP code sent back. If it is correct, it will report success and close the program, otherwise it will report an error and ask for re-entry. Back to the problem of `GET` and `POST`. If it is `GET`, the machine will **parse the JSON response** into variables and display it. Otherwise, if the response code is not `200`, it will report an error with the error information:

{% code title="main.py:25" %}
```python
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
```
{% endcode %}



So that completes a project to verify OTP code sent from **AppVerify Code**. You can get the completed code below:

{% file src="../.gitbook/assets/main.py" %}

{% code title="main.py" %}
```python
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
```
{% endcode %}
