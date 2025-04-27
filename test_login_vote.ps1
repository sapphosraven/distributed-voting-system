# test_login_vote.ps1

# Step 1: Login
$loginBody = @{
    "username" = "alice"
    "password" = "alicepass"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8000/login -Body $loginBody -ContentType "application/json"

# Step 2: Extract token
$accessToken = $loginResponse.access_token
Write-Host "Access Token: $accessToken"

# Step 3: Vote
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type"  = "application/json"
}
$voteBody = @{
    "candidate_id" = "Candidate_A"
} | ConvertTo-Json

$voteResponse = Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8000/vote -Headers $headers -Body $voteBody
Write-Host "Vote Response: $($voteResponse | ConvertTo-Json -Depth 10)"
