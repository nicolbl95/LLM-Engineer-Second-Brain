# LLM Engineer Second Brain

> Un graphe de connaissances interactif qui structure les concepts, architectures, outils et compromis d'ingénierie des systèmes LLM modernes.

[🚀 Explorer le Second Brain](https://nicolbl95.github.io/LLM-Engineer-Second-Brain/)

> Démo publique en lecture seule — naviguez dans le graphe, zoomez, recherchez un concept et cliquez sur un nœud pour afficher son explication.

## Stack de l'application

Les technologies réellement utilisées pour construire l'interface :

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![XYFlow](https://img.shields.io/badge/XYFlow-React_Flow-111827?style=for-the-badge)](https://xyflow.com/)

Le déploiement public est assuré séparément par GitHub Pages via GitHub Actions. GitHub Pages n'est pas une technologie utilisée pour développer l'interface.

## Pourquoi ce projet ?

Le LLM Engineering ne se limite pas aux appels d'API ou au prompt engineering. Construire un système LLM fiable demande de comprendre plusieurs couches techniques, leurs contraintes et les compromis entre qualité, coût, latence, sécurité et maintenabilité.

Ce Second Brain organise visuellement les principales couches nécessaires à la construction de systèmes LLM :

- architecture des modèles ;
- prompting et context engineering ;
- RAG ;
- agents ;
- entraînement et adaptation ;
- serving et inference ;
- optimisation GPU ;
- évaluation ;
- observabilité ;
- sécurité.

Chaque nœud contient une explication du concept, tandis que les liens donnent un contexte sur les relations entre les sujets. Le projet est conçu comme un système d'apprentissage technique évolutif et comme un portfolio d'ingénierie, sans prétendre que son auteur est expert de chacun des domaines présentés.

## Ce que vous pouvez explorer

### Prompt & Context Engineering

- anatomie des prompts ;
- few-shot ;
- prompt chaining ;
- Chain-of-Thought ;
- Tree of Thoughts ;
- sorties structurées ;
- Prompt Ops.

### RAG

- ingestion ;
- chunking ;
- embeddings ;
- vector databases ;
- ChromaDB ;
- Qdrant ;
- Pinecone ;
- reranking ;
- query rewriting ;
- hybrid search ;
- Parent-Child Retrieval ;
- Agentic RAG.

### Agents

- ReAct ;
- Plan-and-Execute ;
- multi-agents ;
- MCP ;
- LangChain ;
- LangGraph.

### Entraînement & adaptation

- pre-training ;
- SFT ;
- RLHF ;
- DPO ;
- Reward Models ;
- PEFT / LoRA ;
- QLoRA ;
- distillation ;
- synthetic data ;
- overfitting.

### Inference & déploiement

- vLLM ;
- SGLang ;
- KV Cache ;
- Continuous Batching ;
- PagedAttention ;
- Prefix Caching ;
- quantification ;
- sparsification ;
- speculative decoding ;
- dimensionnement GPU ;
- self-hosting vs API managée.

### Évaluation & observabilité

- benchmarks ;
- Golden Datasets ;
- LLM-as-a-Judge ;
- DeepEval ;
- tracing ;
- Langfuse ;
- SLO ;
- TTFT ;
- throughput ;
- drift ;
- Human-in-the-Loop.

### Sécurité LLM

- Prompt Injection ;
- Indirect Prompt Injection ;
- Guardrails ;
- Sensitive Information Disclosure ;
- Excessive Agency ;
- Least Privilege ;
- Red Teaming.

### Fondamentaux LLM

- tokenization ;
- embeddings ;
- tensors ;
- architecture Transformer ;
- Mixture of Experts.

## Navigation

Le visiteur peut :

- déplacer le graphe ;
- zoomer ;
- rechercher un concept ;
- cliquer sur un nœud ;
- lire son explication détaillée ;
- suivre les relations entre concepts.

La recherche est accessible depuis l'interface et via `Ctrl+F` (ou `⌘+F` sur macOS). La sélection d'un nœud ouvre une vue détaillée avec ses explications et met en évidence les concepts associés.

## Architecture de l'application

```text
Knowledge Data
      ↓
React + TypeScript
      ↓
XYFlow / React Flow
      ↓
Graphe interactif
      ↓
Navigation / Recherche / Vue détaillée
```

Les données du graphe sont embarquées dans l'application et les fonctionnalités de navigation s'exécutent côté client. Aucun backend LLM n'est nécessaire pour consulter la démo publique. Les modifications du canvas sont conservées localement dans le navigateur.

## Lancer le projet localement

```bash
git clone https://github.com/nicolbl95/LLM-Engineer-Second-Brain.git
cd LLM-Engineer-Second-Brain
npm install
npm run dev
```

Pour générer puis servir la version de production localement :

```bash
npm run build
npm run preview
```

Le déploiement GitHub Pages est déclenché automatiquement par un push sur `main` via [le workflow GitHub Actions](.github/workflows/deploy.yml).

## Auteur

**Nicolas DAVOINE**

**Ingénieur LLM — systèmes d’IA générative.**
