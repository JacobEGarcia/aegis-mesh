locals {
  name = "aegis-${var.environment}"
  tags = {
    Project     = "Aegis Mesh"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "${local.name}-eks"
  cluster_version = "1.31"

  cluster_endpoint_public_access = true
  enable_cluster_creator_admin_permissions = true

  vpc_id     = module.aws_vpc.vpc_id
  subnet_ids = module.aws_vpc.private_subnets

  eks_managed_node_groups = {
    platform = {
      instance_types = ["m7i.large"]
      min_size       = 2
      max_size       = 8
      desired_size   = 3
    }
  }

  tags = local.tags
}

module "aws_vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name}-vpc"
  cidr = "10.20.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.20.1.0/24", "10.20.2.0/24", "10.20.3.0/24"]
  public_subnets  = ["10.20.101.0/24", "10.20.102.0/24", "10.20.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
  tags               = local.tags
}

module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google//modules/private-cluster"
  version = "~> 35.0"

  project_id = var.gcp_project_id
  name       = "${local.name}-gke"
  region     = var.gcp_region
  zones      = ["${var.gcp_region}-b", "${var.gcp_region}-c", "${var.gcp_region}-d"]

  network           = "default"
  subnetwork        = "default"
  ip_range_pods     = ""
  ip_range_services = ""

  enable_private_nodes    = true
  enable_private_endpoint = false
  deletion_protection     = false

  node_pools = [
    {
      name         = "platform"
      machine_type = "e2-standard-2"
      min_count    = 1
      max_count    = 6
      auto_repair  = true
      auto_upgrade = true
    }
  ]
}

resource "azurerm_resource_group" "aegis" {
  name     = "${local.name}-rg"
  location = var.azure_location
  tags     = local.tags
}

resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${local.name}-aks"
  location            = azurerm_resource_group.aegis.location
  resource_group_name = azurerm_resource_group.aegis.name
  dns_prefix          = "${local.name}-aks"

  default_node_pool {
    name                = "platform"
    vm_size             = "Standard_D2s_v5"
    auto_scaling_enabled = true
    min_count           = 2
    max_count           = 8
    node_count          = 3
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
  }

  tags = local.tags
}
