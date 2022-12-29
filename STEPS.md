# Steps To Build an React App Infrastructure

## initialize the project
npx create-react-app zoetic-xumm
cd zoetic-xumm
git init
wget https://raw.githubusercontent.com/facebook/create-react-app/main/.gitignore

## setup the infrastructure
1. create a cert
2. create a s3 bucket for the static site
3. create a cloudfront distribution and assign the cert and s3 bucket
4. create a route53 record for the domain pointing to the cloudfront distribution

## add the dependencies to the package.json

```json
    "postcss": "^8.4.20",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-icons": "^4.7.1",
    "react-markdown": "^8.0.4",
    "react-router-dom": "^6.5.0",
    "tailwindcss": "^3.2.4",
    "uuid": "^9.0.0",
    "xrpl": "^2.7.0-beta.0",
    "xumm": "github:XRPL-Labs/Xumm-Universal-SDK##43eb21f43d683d748af55039753abb4fa62bcf2e",
    "xumm-js-pkce": "^1.0.0",
    "xumm-oauth2-pkce": "^2.5.5",
    "xumm-sdk": "^1.7.0",
    "xumm-xapp-sdk": "^1.4.3",
```

and install them

```bash
npm install
```

## setup the app deployment
add the create deployment script
add the deploy script
configure the scripts
add scripts in package.json

```bash
## cloudfront distribution id
if [[ $env == "dev" ]]; then
    dist_id=''
    s3_bucket=''
elif [[ $env == "prd" ]]; then
    dist_id='E3564380Z4HV6S'
    s3_bucket='zoetic.xurlpay.org'
fi
```

```json
"scripts": {
    "serve-local": "bash ./scripts/create-deployment-json.sh local && cp ./environment/deployment.json ./src/. && npm run build && npm start",
    "deploy-prd": "bash ./scripts/create-deployment-json.sh prd && cp ./environment/deployment.json ./src/. && npm run build && bash ./scripts/deploy.sh prd"
}
```

make sure you have the aws cli installed and configured

```bash
pip install awscli
aws configure

## add the following to your ~/.aws/config
[xurlpay]
aws_access_key_id=<yours>
aws_secret_access_key=<yours>

```

## now serve the app locally
`npm install -g serve`
`npm run serve-local`

## now deploy the app
`npm run deploy-prd`

## you should be able to get to the app on the internet
`https://zoetic.xurlpay.org/`