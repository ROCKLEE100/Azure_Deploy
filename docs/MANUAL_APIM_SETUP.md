# Manual APIM Setup Guide (Azure Portal)

This guide walks you through setting up Azure API Management manually using the Azure Portal. We will configure it to sit in front of your AKS cluster.

## Step 1: Create the APIM Service

**Why?** This creates the actual gateway infrastructure.

1.  Log in to the [Azure Portal](https://portal.azure.com).
2.  Search for **"API Management services"** in the top search bar and select it.
3.  Click **+ Create**.
4.  **Basics Tab**:
    *   **Subscription**: Select your subscription.
    *   **Resource Group**: `Azure_Practice` (same as your AKS).
    *   **Region**: `Central India` (CRITICAL: Must match your AKS region for performance).
    *   **Resource Name**: Give it a unique name, e.g., `devops-assistant-gateway`.
    *   **Organization Name**: Your company or name.
    *   **Administrator Email**: Your email.
    *   **Pricing Tier**: Select **Developer (No SLA)** for testing (cheapest) or **Basic** for production.
5.  Click **Review + create**, then **Create**.
    *   *Note: This can take 30-45 minutes to deploy. You can grab a coffee!* ☕

---

## Step 2: Define the Backend (AKS)

**Why?** We need to tell APIM where to forward the requests. By defining a "Backend" object, we can manage the connection URL in one place.

1.  Once APIM is deployed, go to the resource.
2.  On the left menu, under **APIs**, click **Backends**.
3.  Click **+ Add**.
4.  **Name**: `aks-backend` (We will reference this name in policies later).
5.  **Type**: `HTTP(s)`.
6.  **Runtime URL**: `https://devops-assistant.centralindia.cloudapp.azure.com/api`
    *   *This is your current direct AKS Ingress URL.*
7.  **Protocol**: `HTTPS`.
8.  **Validate certificate chain**: Uncheck if you are using self-signed certs, otherwise keep checked.
9.  Click **Create**.

---

## Step 3: Create the API

**Why?** This defines the "front door" that your React app will talk to.

1.  On the left menu, click **APIs**.
2.  Click **+ Add API**.
3.  Select **HTTP** (Manually define an HTTP API).
4.  **Create from definition**:
    *   **Display name**: `DevOps Assistant`.
    *   **Name**: `devops-assistant` (auto-filled).
    *   **Web service URL**: `https://devops-assistant.centralindia.cloudapp.azure.com/api` (This is a default, but our Policy will override it to use the Backend entity we just created).
    *   **API URL suffix**: `devops-assistant`.
        *   *Your final URL will look like: `https://<apim-name>.azure-api.net/devops-assistant`*
5.  Click **Create**.

---

## Step 4: Add Operations (Endpoints)

**Why?** We need to explicitly allow specific paths like `/chat`.

1.  Select your new **DevOps Assistant** API.
2.  Click **+ Add operation**.
3.  **Operation 1: Chat**
    *   **Display name**: `Chat`.
    *   **Name**: `chat`.
    *   **URL**: Select **POST** and enter `/chat`.
    *   Click **Save**.
4.  **Operation 2: Health**
    *   **Display name**: `Health Check`.
    *   **Name**: `health`.
    *   **URL**: Select **GET** and enter `/health`.
    *   Click **Save**.

---

## Step 4.5: Products & Subscriptions (The Business Layer)

**Why?**
*   **Products**: Bundle multiple APIs together (e.g., "Free Tier", "Premium Tier"). You apply policies (like rate limits) here to affect all APIs in the bundle.
*   **Subscriptions**: The "keys" to the castle. Developers subscribe to a Product to get an API Key (`Ocp-Apim-Subscription-Key`).

### 1. Create a Product
1.  On the left menu, click **Products**.
2.  Click **+ Add**.
3.  **Display name**: `Gold Tier`.
4.  **Id**: `gold-tier`.
5.  **State**: **Published** (so it can be used immediately).
6.  **Requires subscription**: ✅ Checked.
7.  **Requires approval**: Unchecked (for now).
8.  **Subscription count limit**: Leave blank.
9.  Click **Create**.

### 2. Add API to Product
1.  Click on your new **Gold Tier** product.
2.  Click **APIs** (on the left, inside the Product blade).
3.  Click **+ Add**.
4.  Select **DevOps Assistant**.
5.  Click **Select**.
    *   *Now, anyone with a "Gold Tier" subscription can access this API.*

### 3. Create a Subscription (Get a Key)
1.  On the main left menu (not inside Product), click **Subscriptions**.
2.  Click **+ Add subscription**.
3.  **Name**: `my-test-subscription`.
4.  **Display name**: `My Test Key`.
5.  **Scope**: **Product**.
6.  **Product**: Select **Gold Tier**.
7.  Click **Create**.
8.  Find your new subscription in the list. Click the **...** (dots) at the end -> **Show/Hide keys**.
9.  Copy the **Primary key**. You will need this header (`Ocp-Apim-Subscription-Key`) to call the API now!

---

## Step 5: Apply Policies (The "Brain")

**Why?** This is where the magic happens: Auth, Rate Limiting, and Routing.

1.  Select the **DevOps Assistant** API.
2.  Click on the **Design** tab.
3.  Select **All operations** (so this applies to both Chat and Health).
4.  In the **Inbound processing** box, click the **</>** (Code editor) icon.
5.  **Delete everything** in the editor and paste the following XML.

### Policy XML to Paste:

```xml
<policies>
    <inbound>
        <base />
        <!-- 1. CORS: Allow your frontend to call this API -->
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>https://devops-assistant.centralindia.cloudapp.azure.com</origin>
                <origin>http://localhost:5173</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
                <method>OPTIONS</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
        </cors>

        <!-- 2. Rate Limiting: Protect your backend -->
        <rate-limit-by-key calls="100" renewal-period="60" counter-key="@(context.Request.IpAddress)" />

        <!-- 3. JWT Validation: Secure the API (Optional for Health, enforced for others) -->
        <choose>
            <when condition="@(context.Operation.UrlTemplate != "/health")">
                <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized">
                    <openid-config url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration" />
                    <audiences>
                        <audience>cd7eeb97-7ffd-4369-bd04-c5b76df938ce</audience>
                        <audience>api://cd7eeb97-7ffd-4369-bd04-c5b76df938ce</audience>
                    </audiences>
                    <required-claims>
                        <claim name="aud" match="any">
                            <value>cd7eeb97-7ffd-4369-bd04-c5b76df938ce</value>
                            <value>api://cd7eeb97-7ffd-4369-bd04-c5b76df938ce</value>
                        </claim>
                    </required-claims>
                </validate-jwt>
            </when>
        </choose>

        <!-- 4. Route to Backend: Send traffic to the AKS Backend entity -->
        <set-backend-service backend-id="aks-backend" />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
```

6.  Click **Save**.

---

## Step 6: Test It!

1.  Go to the **Test** tab in the APIM portal.
2.  Select **Health Check**.
3.  Click **Send**. You should see a **200 OK**.
4.  Select **Chat**.
5.  Click **Send** (without headers). You should see **401 Unauthorized**.
6.  Add a header: `Authorization: Bearer <your-token>` and test again.

## Step 7: Update Frontend

Once verified, you need to tell your React app to use this new URL.

1.  Get your **Gateway URL** from the APIM **Overview** page (e.g., `https://devops-assistant-gateway.azure-api.net`).
2.  Update your `helm/values.yaml`:
    ```yaml
    frontend:
      env:
        VITE_API_URL: "https://<your-apim-name>.azure-api.net/devops-assistant"
    ```
3.  Deploy the changes.
