# Aegis Mesh

Aegis Mesh is a multi-cloud incident-intelligence command center. It correlates Kubernetes telemetry, deployments, configuration, runbooks, and incident history through vector retrieval, then validates a proposed remediation inside an isolated replay environment.

The repository contains:

- A polished interactive command center built with Next.js and React.
- A live server-side vector-search endpoint with 96-dimensional embeddings and cosine ranking.
- An optional Qdrant adapter for a production vector store.
- A container build and production Kubernetes stack.
- Terraform definitions for EKS, GKE, and AKS.
- A production Cloudflare deployment for the credential-free demonstration.

## Product capabilities

- Explore an interactive service topology spanning AWS, Google Cloud, and Azure.
- Ask natural-language incident questions and retrieve ranked evidence with provenance.
- Inspect the semantic neighborhood around an incident.
- Replay a production failure inside an isolated Kubernetes namespace.
- Validate a remediation against SLO, security, cost, and regression gates.
- Simulate traffic failover between cloud regions.

## Vector-search architecture

`POST /api/search` creates a normalized 96-dimensional embedding for the query and compares it with the evidence index using cosine similarity. The deterministic local index keeps the public demo fast and self-contained.

When `QDRANT_URL` is configured, the same endpoint queries the `aegis_evidence` collection in Qdrant. If Qdrant is unavailable, it fails safely back to the embedded index.

Example:

```bash
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"query":"Why did checkout latency spike after the deployment?"}'
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run as a container

```bash
docker build -t aegis-mesh:local .
docker run --rm -p 3000:3000 aegis-mesh:local
```

## Deploy to Kubernetes

Update the web image in `deploy/kubernetes/aegis-mesh.yaml`, then apply:

```bash
kubectl apply -f deploy/kubernetes/aegis-mesh.yaml
```

The stack includes:

- A three-replica Aegis deployment with rolling updates.
- Horizontal autoscaling from 3 to 20 replicas.
- Pod disruption and topology-spread policies.
- A three-replica Qdrant StatefulSet with persistent volumes.
- Default-deny and explicit service network policies.
- Health probes and resource boundaries.

## Provision the multi-cloud fleet

The Terraform configuration under `infra/terraform` defines an EKS cluster in AWS, a private GKE cluster in Google Cloud, and an AKS cluster in Azure.

```bash
cd infra/terraform
terraform init
terraform plan \
  -var="gcp_project_id=YOUR_PROJECT" \
  -var="azure_subscription_id=YOUR_SUBSCRIPTION"
```

Applying the plan creates billable cloud resources. Review pricing, IAM, networking, and production-security requirements before applying it.

## Design principles

1. Every conclusion stays attached to evidence.
2. Remediation is simulated before production execution.
3. Cloud and cluster boundaries remain visible.
4. The demonstration is honest about simulated telemetry while exercising real retrieval and ranking code.
