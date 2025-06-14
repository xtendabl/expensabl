const https = require('https');

// Replace <guid> with the actual expense GUID
const guid = '78b0391e-87d0-44fc-92cb-708e38d9d382';
console.log(guid); 
const url = `https://app.navan.com/api/liquid/user/expenses/${guid}`;

const options = {
    method: 'GET',
    headers: {
        // Add authentication headers if required, e.g.:
        // 'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
        'Accept': 'application/json',
        'Authorization': 'TripActions TripActions eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjEtMDItMjMtcHJvZCJ9.ewogICJzZXJ2ZXJSZWdpb24iIDogIlVTIiwKICAic3VwZXJBZG1pbiIgOiBmYWxzZSwKICAianRpIiA6ICJkZmFkM2M4NC0xMzM0LTQ4ODgtOGM3MC00ZWM2NjRkYmZjNzkiLAogICJpYXQiIDogMTc0MzM4Njg0MCwKICAic3ViIiA6ICIwZDNlZDBiOS02Njg4LTQxMmQtYjIzYi02ODJjY2I3NWNkNWMiLAogICJlbWFpbCIgOiAiZ2lvQGV4dGVuZGFibC5kZXYiLAogICJnaXZlbl9uYW1lIiA6ICJHaW92YW5uaSIsCiAgImZhbWlseV9uYW1lIiA6ICJNb2xhIiwKICAicHJlZmVycmVkX25hbWUiIDogIkdpb3Zhbm5pIiwKICAicm9sZXMiIDogWyAiTElRVUlEX0FETUlOIiwgIkFETUlOIiBdLAogICJwZXJtaXNzaW9ucyIgOiBbIF0sCiAgImNvbXBhbnlVdWlkIiA6ICIzMTY1ZWE1Ni1hMTVmLTQ3YmQtOWY0OC1kNjk2NTdkZTdiNmQiLAogICJpbXBlcnNvbmF0ZWQiIDogZmFsc2UsCiAgImltcGVyc29uYXRvclN1cGVyQWRtaW4iIDogZmFsc2UsCiAgInJlZmVycmVyIiA6ICJUUklQQUNUSU9OUyIsCiAgInJlX3NpZ25fdG9rZW4iIDogZmFsc2UKfQ.S22yC6Rlxdq1vLF69_rIMEfvc_KJsoxQ5JIkGNZYXkuelYipMObZNjN8S_-cDCJAExZYqvDbf_XSWu7SIPNl8IIPuLYTr1zTEUxm3ODu-_Kq9_hpzgNhcobyiY0g6Gj9H4CdZExQ3O5b3MEH2ykjjIDUwYHTegpcdRI3_gZXT0ff1F7KV4vB_GizPZP-XO6vIUgz2kAHwjC5HDYZMYO5dAnD3hU5k8Uw86_nxvXJW1JnnHSoL8bjNR8biN-NIwiIeEZqm4mNYyaLZ-NAf8yMMwbWCtsrNBOCXXhDqD5Syrv_aZiw16q2LbRWHR011Vb8SgIRCjGWwj8RNNGDaQOcVTdbHX-LPU1-ms9VwaTIYU-pw5wk2vnKRGPMLqL6zGzlkH1ZDjenh2x6HLErJN9JxwcIf9uoSuQprsUnR0c3J9XABh7gRqji7MAiyo6uSI19xCrTKjK0NL-D9YnPZvb0KCRRZDhPBGjf_pi8XXRmLtS2ECP80LXXPHk6Q3EOS6Ois1iv-Y8NWTemL2fGuTvs3Tf-lI5BY4kj7Cln-Cw8a8eaL7SVxM6BbjBWXpYD2D-SjSAB75CYBy3j2Q8YYZfN_YepW9sxMBWRv8--MR3hIZGeuc3e-pNz3EKW8RpEtN3lKVS1N1gXnS0eNJzUiM4f4QvWECOy3lCQDBEYRcs1Xwo'
    }
};

https.get(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(json);
        } catch (e) {
            console.error('Error parsing response:', e);
            console.log(data);
        }
    });
}).on('error', (err) => {
    console.error('Request error:', err);
});