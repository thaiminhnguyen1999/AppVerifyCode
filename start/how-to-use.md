---
icon: question
---

# How to use

{% hint style="warning" %}
To use **AppVerify Code**, you must have some understanding of API.
{% endhint %}

{% hint style="warning" %}
**Notes:**

* **AppVerify Code** only supports two methods `GET` and `POST`.
* For `GET` method, only one `params` is used, `avc_authkey; POST` uses two`params`, `avc_authkey andchat_id.`
{% endhint %}

### URL Structure

```url
https://appverifycode.onrender.com/api/otpVerification?avc_authkey=<your-authkey>&chat_id=<user-chatid>
```

Includes `params`:

* `avc_authkey`: `AVC AuthKey` code to use **AppVerify Code.**
* `chat_id`: **ChatID of Telegram User**, taken from bold part of response when running `/start` command in **AppVerify Code Bot** (used for `POST` method).

{% hint style="info" %}
You can try out the AppVerify Code API at:

```
https://appverifycode.onrender.com/api/otpVerification?avc_authkey=RChuiOSiuM5t3nKiDtE7vYqnIoAdVNZQSt0UwhpzxrhUfbB2qwmtSP3zU21WLQgn5XAMcNV4zRtgLeX3X7Foxk1r31Qd15GIg2RpeMjfNcw4eSjhdbacVt6ZPdGBjcTneL1aYuDN8D93sxDsHDWBVItoj7KsVZ1QzBCm6oGuVoa0opIZshMSBwDYFp7HyimMpiERvoSL5wPChasPN0KZHmKlxvfqmU94gRsQ2W9wBlQUw3OH2eBKMiiwnu1XP7e
```
{% endhint %}

### cURL Command

{% code title="cURL for Linux/Windows" %}
```sh
curl -X <TYPE> "https://appverifycode.onrender.com/api/otpVerification?avc_authkey=<your-authkey>&chat_id=<user-chatid>"
```
{% endcode %}

RESTful types:

* `GET`: Return JSON data about application information via `AVC AuthKey`
* `POST`: Send random OTP verification code to user via `chat_id` along with information of the application sending the code

Includes `params`:

* `avc_authkey`: `AVC AuthKey` code to use **AppVerify Code**
* `chat_id`: **ChatID of Telegram User**, taken from bold part of response when running `/start` command in **AppVerify Code Bot** (used for `POST` method).
