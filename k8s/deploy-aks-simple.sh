#!/bin/bash

# MCPHUB AKS 간단 배포 스크립트 (테스트용 - 도메인 없이 LoadBalancer IP로 접근)

set -e

echo "🚀 MCPHUB AKS 간단 배포를 시작합니다..."

# 변수 설정 - 실제 환경에 맞게 수정하세요
RESOURCE_GROUP="rg-az01-sbox-yamlette-01"           # Azure 리소스 그룹 이름 (AKS 클러스터가 속한 리소스 그룹)
CLUSTER_NAME="aks-az01-sbox-yamlette-01"            # AKS 클러스터 이름 (Azure Portal에서 확인 가능)
NAMESPACE="mcphub"                   # Kubernetes 네임스페이스 이름 (애플리케이션이 배포될 네임스페이스)
DOCKERHUB_USERNAME="ujeongeom"       # Docker Hub 사용자명 (본인의 Docker Hub 계정명으로 변경)
REPOSITORY_NAME="otel_hub"           # Docker Hub repository 이름

# Docker Hub 사용자명 확인
if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo "❌ DOCKERHUB_USERNAME이 설정되지 않았습니다!"
    echo "스크립트에서 DOCKERHUB_USERNAME 변수를 설정해주세요."
    exit 1
fi

# Azure CLI 로그인 확인
echo "🔐 Azure CLI 로그인 상태 확인..."
if ! az account show &> /dev/null; then
    echo "❌ Azure CLI에 로그인되어 있지 않습니다!"
    echo "다음 명령어로 로그인하세요: az login"
    exit 1
fi

# AKS 클러스터 연결
echo "🔗 AKS 클러스터 연결 중..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --overwrite-existing

# kubectl 연결 확인
echo "🔍 kubectl 연결 확인..."
kubectl cluster-info

# 네임스페이스 생성
echo "📦 네임스페이스 생성 중..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Docker Hub 이미지 경로 업데이트
echo "🐳 Docker Hub 이미지 경로 업데이트 중..."
sed -i "" "s/ujeongeom/$DOCKERHUB_USERNAME/g" deployment.yaml
sed -i "" "s/otel_hub/$REPOSITORY_NAME/g" deployment.yaml

# Secret 적용
echo "🔒 Secret 적용 중..."
echo "⚠️  주의: secret.yaml 파일에서 실제 값들을 base64로 인코딩하여 설정하세요"
kubectl apply -f secret.yaml -n $NAMESPACE

# ConfigMap 적용
echo "📋 ConfigMap 적용 중..."
kubectl apply -f configmap.yaml -n $NAMESPACE

# AKS 전용 PVC 적용
echo "💾 AKS PersistentVolumeClaim 적용 중..."
kubectl apply -f aks-pvc.yaml -n $NAMESPACE

# Deployment 적용
echo "🏗️  Deployment 적용 중..."
kubectl apply -f deployment.yaml -n $NAMESPACE

# Service 적용
echo "🌐 Service 적용 중..."
kubectl apply -f service.yaml -n $NAMESPACE

echo "✅ AKS 배포 완료!"
echo ""
echo "📊 배포 상태 확인:"
kubectl get pods -n $NAMESPACE
echo ""
echo "🔗 서비스 확인:"
kubectl get svc -n $NAMESPACE
echo ""

# LoadBalancer 외부 IP 확인 및 대기
echo "🔍 LoadBalancer 외부 IP 확인 중..."
echo "⏳ 외부 IP 할당까지 2-3분 정도 소요될 수 있습니다..."

# 외부 IP가 할당될 때까지 대기
while true; do
    EXTERNAL_IP=$(kubectl get svc mcphub-loadbalancer -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [ -n "$EXTERNAL_IP" ] && [ "$EXTERNAL_IP" != "null" ]; then
        echo ""
        echo "🎉 외부 IP 할당 완료!"
        echo "🌐 MCPHUB 접근 URL: http://$EXTERNAL_IP"
        echo ""
        echo "📋 Cursor IDE MCP 서버 설정에 사용할 URL:"
        echo "    http://$EXTERNAL_IP"
        echo ""
        break
    else
        echo -n "."
        sleep 10
    fi
done

echo "🔍 유용한 명령어들:"
echo "# 애플리케이션 로그 확인"
echo "kubectl logs -f deployment/mcphub -n $NAMESPACE"
echo ""
echo "# 데이터베이스 로그 확인"
echo "kubectl logs -f deployment/postgres -n $NAMESPACE"
echo ""
echo "# 포트 포워딩으로 로컬 접근 (개발용)"
echo "kubectl port-forward svc/mcphub-service 3000:80 -n $NAMESPACE"
echo ""
echo "# Pod 상태 실시간 확인"
echo "kubectl get pods -n $NAMESPACE -w"
echo ""
echo "# 서비스 상태 확인"
echo "kubectl get svc -n $NAMESPACE"

echo ""
echo "🎯 다음 단계:"
echo "1. 브라우저에서 http://$EXTERNAL_IP 접속하여 MCPHUB 웹 인터페이스 확인"
echo "2. Cursor IDE에서 MCP 서버 설정에 http://$EXTERNAL_IP 추가"
echo "3. 로그인 정보: admin / password (기본값)"
echo ""
echo "ℹ️  사용된 Docker 이미지: $DOCKERHUB_USERNAME/$REPOSITORY_NAME:latest" 