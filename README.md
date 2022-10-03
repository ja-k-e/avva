This work uses the WebAudio and UserMedia Web Browser APIs. At the time of creation, these APIs have evolved but are still in relatively early stages. The camera used is a two-dimensional camera which is commonly plugged in via USB.

encode `openssl base64 -in index.html -out test -A`
decode `openssl base64 -in test -out whatever.html -A -d`

`python3 -m http.server`
