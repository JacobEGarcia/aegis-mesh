variable "environment" {
  type    = string
  default = "demo"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "gcp_project_id" {
  type        = string
  description = "Google Cloud project that will host the GKE cluster."
}

variable "gcp_region" {
  type    = string
  default = "europe-west1"
}

variable "azure_subscription_id" {
  type        = string
  description = "Azure subscription that will host the AKS cluster."
}

variable "azure_location" {
  type    = string
  default = "westeurope"
}
