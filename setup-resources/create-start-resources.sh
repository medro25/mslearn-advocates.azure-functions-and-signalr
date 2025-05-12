#!/bin/bash

# To use the Microsoft Learn Sandbox in the training module
# https://learn.microsoft.com/training/modules/automatic-update-of-a-webapp-using-azure-functions-and-signalr
# To run: sign in to Azure CLI with `az login`
# Usage: bash create-start-resources.sh "SUBSCRIPTION_NAME_OR_ID"

echo "Param 1: $1"

LOCATION="eastus2"
echo "Location: $LOCATION"

# Check if user is logged into Azure CLI
if ! az account show &> /dev/null; then
  echo "You are not logged into Azure CLI. Please log in with 'az login' and try again."
  exit 1
fi

echo "User logged in"

NODE_ENV_FILE="./.env"

# Get user name
USER_NAME=$(az account show --query 'user.name' -o tsv)
USER_NAME=${USER_NAME%%@*}
echo "User name: $USER_NAME"

# Get the default subscription from input
SUBSCRIPTION_NAME=$1
az configure --defaults subscription="$SUBSCRIPTION_NAME"
echo "Using subscription: $SUBSCRIPTION_NAME"

# Generate a random string for resource group
RANDOM_STRING=$(openssl rand -hex 5)
RESOURCE_GROUP_NAME="$USER_NAME-signalr-$RANDOM_STRING"

# Create a resource group
az group create \
  --subscription "$SUBSCRIPTION_NAME" \
  --name "$RESOURCE_GROUP_NAME" \
  --location $LOCATION

az configure --defaults group="$RESOURCE_GROUP_NAME"
echo "Using resource group $RESOURCE_GROUP_NAME"

export STORAGE_ACCOUNT_NAME=signalr$(openssl rand -hex 5)
export COMSOSDB_NAME=signalr-cosmos-$(openssl rand -hex 5)

echo "Subscription Name: $SUBSCRIPTION_NAME"
echo "Resource Group Name: $RESOURCE_GROUP_NAME"
echo "Storage Account Name: $STORAGE_ACCOUNT_NAME"
echo "CosmosDB Name: $COMSOSDB_NAME"

echo "Creating Storage Account"
az storage account create \
  --subscription "$SUBSCRIPTION_NAME" \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --kind StorageV2 \
  --sku Standard_LRS

echo "Creating CosmosDB Account"
az cosmosdb create \
  --subscription "$SUBSCRIPTION_NAME" \
  --name $COMSOSDB_NAME \
  --resource-group $RESOURCE_GROUP_NAME

echo "Creating CosmosDB database"
az cosmosdb sql database create \
  --account-name $COMSOSDB_NAME \
  --name stocksdb

echo "Creating CosmosDB container"
az cosmosdb sql container create \
  --account-name $COMSOSDB_NAME \
  --database-name stocksdb \
  --partition-key-path "/symbol"


echo "Get storage connection string"
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --query "connectionString" -o tsv)

echo "Get CosmosDB account name"
COSMOSDB_ACCOUNT_NAME=$(az cosmosdb list \
  --subscription "$SUBSCRIPTION_NAME" \
  --resource-group $RESOURCE_GROUP_NAME \
  --query [0].name -o tsv)

echo "Get CosmosDB connection string"
COSMOSDB_CONNECTION_STRING=$(az cosmosdb keys list --type connection-strings \
  --name $COSMOSDB_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --subscription "$SUBSCRIPTION_NAME" \
  --query "connectionStrings[?description=='Primary SQL Connection String'].connectionString" -o tsv)

echo -e "\nReplace <STORAGE_CONNECTION_STRING> with:\n$STORAGE_CONNECTION_STRING"
echo -e "\nReplace <COSMOSDB_CONNECTION_STRING> with:\n$COSMOSDB_CONNECTION_STRING"

# Write to .env file
cat >> $NODE_ENV_FILE <<EOF
STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING
COSMOSDB_CONNECTION_STRING=$COSMOSDB_CONNECTION_STRING
EOF

echo -e "RESOURCE_GROUP_NAME=$RESOURCE_GROUP_NAME" >> $NODE_ENV_FILE

echo -e "\nRESOURCE_GROUP_NAME=$RESOURCE_GROUP_NAME"

# Validate the .env file
if [ -f "$NODE_ENV_FILE" ]; then
  echo -e "\nThe .env file was created successfully."
else
  echo -e "\nThe .env file was not created."
fi
