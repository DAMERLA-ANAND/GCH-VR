import httpx
headers={'X-Endpoint-API-UserInfo':'role=CARDMEMBER;user_id=00000000-0000-0000-0000-000000000001;email=alice@example.com','Content-Type':'application/json'}
data={'transaction_ref':'tok_visa_txn_998877','category':'NON_DELIVERY','amount':149.99,'currency':'USD','description':'The package never arrived and the merchant did not provide tracking.'}
resp=httpx.post('http://127.0.0.1:8000/api/v1/disputes', headers=headers, json=data, timeout=10)
print(resp.status_code)
print(resp.text)
