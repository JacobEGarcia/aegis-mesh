output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "gke_cluster_name" {
  value = module.gke.name
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}
