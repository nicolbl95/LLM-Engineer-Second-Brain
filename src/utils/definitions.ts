import type { BrainNode, Language } from "../types/brain";
import { brainNodes } from "../data/graph";
import { pick } from "./i18n";


interface DefinitionResult {
  term: string;
  simpleDefinition: string;
  metaphor: string;
  whyItMatters: string;
  foundInGraph: boolean;
  nodeId?: string;
}

/**
 * Normalize common typos and variations of technical terms.
 */
function normalizeTerm(term: string): string {
  const lower = term.toLowerCase().trim();
  
  // Common variations and typos
  const normalizations: Record<string, string> = {
    "embeding": "embedding",
    "embeddings": "embedding",
    "ia": "ai",
    "artificial intelligence": "ai",
    "llms": "llm",
    "large language model": "llm",
    "agents": "agent",
    "workflows": "workflow",
    "prompts": "prompt",
    "vectors": "vector",
    "tokens": "token",
    "fine tunings": "fine-tuning",
    "finetuning": "fine-tuning",
    "retrieval augmented generation": "rag",
  };

  return normalizations[lower] || lower;
}

/**
 * Generate a beginner-friendly definition for a technical term.
 * ALWAYS returns full paragraphs, never short fragments.
 */
export function generateDefinition(term: string, language: Language): DefinitionResult {
  const trimmed = term.trim();
  if (!trimmed) {
    return {
      term: trimmed,
      simpleDefinition: language === "fr" ? "" : "",
      metaphor: language === "fr" ? "" : "",
      whyItMatters: language === "fr" ? "" : "",
      foundInGraph: false,
    };
  }

  // Normalize the term
  const normalizedTerm = normalizeTerm(trimmed);
  
  // Search for matching node in graph (for context only)
  const matchedNode = findMatchingNode(normalizedTerm);
  
  // Get graph context if available
  const graphContext = matchedNode ? {
    title: pick(matchedNode.title, language),
    summary: pick(matchedNode.shortSummary, language),
    explanation: pick(matchedNode.simpleExplanation, language),
    deepExplanation: pick(matchedNode.deepExplanation, language),
  } : null;

  // Always generate from comprehensive templates, using graph data as context
  return buildFallbackDefinition(normalizedTerm, language, graphContext);
}

function findMatchingNode(term: string): BrainNode | null {
  const lowerTerm = term.toLowerCase();

  // Exact match first
  const exactMatch = brainNodes.find((node) => {
    const titleFr = node.title.fr.toLowerCase();
    const titleEn = node.title.en.toLowerCase();
    return titleFr === lowerTerm || titleEn === lowerTerm;
  });

  if (exactMatch) return exactMatch;

  // Partial match
  const partialMatch = brainNodes.find((node) => {
    const titleFr = node.title.fr.toLowerCase();
    const titleEn = node.title.en.toLowerCase();
    const summaryFr = node.shortSummary?.fr.toLowerCase() || "";
    const summaryEn = node.shortSummary?.en.toLowerCase() || "";
    
    return (
      titleFr.includes(lowerTerm) ||
      titleEn.includes(lowerTerm) ||
      summaryFr.includes(lowerTerm) ||
      summaryEn.includes(lowerTerm)
    );
  });

  return partialMatch || null;
}


export function buildMetaphorFromNode(node: BrainNode, language: Language): string {
  const isEn = language === "en";
  
  // Try to extract metaphor from examples or create one based on node type
  const examples = node.examples[language];
  if (examples && examples.length > 0) {
    return examples[0];
  }

  // Generate simple metaphors for common concepts
  const title = pick(node.title, language).toLowerCase();
  
  if (title.includes("embedding")) {
    return isEn
      ? "Like translating a book into a universal code that captures its meaning, so computers can understand relationships between ideas."
      : "Comme traduire un livre dans un code universel qui capture son sens, pour que les ordinateurs puissent comprendre les relations entre les idées.";
  }
  
  if (title.includes("rag") || title.includes("retrieval")) {
    return isEn
      ? "Like having a smart research assistant who looks up relevant information in a library before answering your question."
      : "Comme avoir un assistant de recherche intelligent qui consulte une bibliothèque avant de répondre à votre question.";
  }
  
  if (title.includes("fine-tun")) {
    return isEn
      ? "Like teaching a general expert a specific skill by showing them many examples of that particular task."
      : "Comme apprendre à un expert général une compétence spécifique en lui montrant de nombreux exemples de cette tâche particulière.";
  }
  
  if (title.includes("token")) {
    return isEn
      ? "Like breaking a sentence into words or word-pieces so the AI can process them one at a time."
      : "Comme découper une phrase en mots ou morceaux de mots pour que l'IA puisse les traiter un par un.";
  }
  
  if (title.includes("vector") || title.includes("embedding")) {
    return isEn
      ? "Like giving each concept a GPS coordinate in meaning-space, so similar ideas are close together."
      : "Comme donner à chaque concept des coordonnées GPS dans l'espace du sens, pour que les idées similaires soient proches.";
  }
  
  if (title.includes("llm") || title.includes("language model")) {
    return isEn
      ? "Like an incredibly well-read person who has read almost everything on the internet and can answer questions on any topic."
      : "Comme une personne incroyablement cultivée qui a lu presque tout sur internet et peut répondre sur n'importe quel sujet.";
  }
  
  if (title.includes("prompt")) {
    return isEn
      ? "Like giving clear instructions to a very capable but literal-minded assistant who needs precise guidance."
      : "Comme donner des instructions claires à un assistant très capable mais littéral qui a besoin de guidance précise.";
  }
  
  if (title.includes("agent")) {
    return isEn
      ? "Like a self-directed worker who can plan, use tools, and complete complex tasks with minimal supervision."
      : "Comme un travailleur autonome qui peut planifier, utiliser des outils et accomplir des tâches complexes avec une supervision minimale.";
  }
  
  if (title.includes("workflow")) {
    return isEn
      ? "Like a recipe or checklist that tells an AI system exactly what steps to follow to complete a task."
      : "Comme une recette ou une checklist qui dit à un système IA exactement quelles étapes suivre pour accomplir une tâche.";
  }

  // Default metaphor
  return isEn
    ? `A building block in the world of AI and LLM engineering that helps create more intelligent systems.`
    : `Un bloc de construction dans le monde de l'IA et de l'ingénierie LLM qui aide à créer des systèmes plus intelligents.`;
}

function buildFallbackDefinition(term: string, language: Language, _graphContext: { title: string; summary: string; explanation: string; deepExplanation: string; } | null): DefinitionResult {
  const isEn = language === "en";
  const lowerTerm = term.toLowerCase();

  // Comprehensive definitions for common AI/ML terms
  const definitions: Record<string, { fr: DefinitionResult; en: DefinitionResult }> = {
    "rag": {
      fr: {
        term: "RAG (Retrieval-Augmented Generation)",
        simpleDefinition: `Le RAG, ou Retrieval-Augmented Generation, est une technique qui permet à un modèle de langage de répondre en utilisant des documents ou des données externes, au lieu de se baser uniquement sur ce qu'il a appris pendant son entraînement. Concrètement, quand vous posez une question, le système cherche d'abord les informations les plus pertinentes dans une base de connaissances (comme une base de données vectorielle), puis il donne ces informations au LLM pour qu'il puisse produire une réponse plus précise, plus récente et mieux ancrée dans des sources vérifiables.`,
        metaphor: `Imaginez un étudiant qui passe un examen. Un LLM classique répond seulement avec sa mémoire, comme un étudiant qui n'aurait pas le droit d'ouvrir un livre pendant l'examen. Un système RAG ressemble plutôt à un étudiant qui peut rapidement chercher dans un manuel ou des notes de cours avant de répondre. La réponse est toujours rédigée par l'étudiant, mais elle est appuyée par les informations trouvées dans les documents. Cela permet de donner des réponses plus précises et de réduire les erreurs.`,
        whyItMatters: `Le RAG est crucial parce que la plupart des applications LLM en entreprise ont besoin d'accéder à des informations privées, récentes ou spécifiques à un domaine qui ne sont pas présentes dans les données d'entraînement du modèle. Par exemple, un chatbot de support client doit connaître les politiques spécifiques de l'entreprise, ou un assistant juridique doit accéder à des contrats spécifiques. Le RAG permet également de réduire les hallucinations, car le modèle peut s'appuyer sur un contexte récupéré plutôt que d'inventer des réponses. C'est l'un des patterns les plus importants pour construire des chatbots d'entreprise, des assistants documentaires, des copilotes de connaissance et des outils de support client modernes.`,
        foundInGraph: false,
      },
      en: {
        term: "RAG (Retrieval-Augmented Generation)",
        simpleDefinition: `RAG, or Retrieval-Augmented Generation, is a technique that allows a language model to answer questions using external documents or data sources, instead of relying only on what it learned during training. When you ask a question, the system first searches for the most relevant information in a knowledge base (such as a vector database), then provides that information to the LLM so it can produce a more accurate, more recent, and better-grounded answer based on verifiable sources.`,
        metaphor: `Imagine a student taking an exam. A regular LLM answers from memory alone, like a student who isn't allowed to open a textbook during the exam. A RAG system is like a student who can quickly search through a manual or course notes before answering. The answer is still written by the student, but it's supported by information found in the documents. This allows for more accurate answers and helps reduce mistakes.`,
        whyItMatters: `RAG is crucial because most enterprise LLM applications need access to private, recent, or domain-specific information that isn't present in the model's training data. For example, a customer support chatbot needs to know company-specific policies, or a legal assistant needs to access specific contracts. RAG also helps reduce hallucinations because the model can rely on retrieved context instead of making up answers. It's one of the most important patterns for building enterprise chatbots, document assistants, knowledge copilots, and modern customer support tools.`,
        foundInGraph: false,
      }
    },
    "embedding": {
      fr: {
        term: "Embedding (Plongement vectoriel)",
        simpleDefinition: `Un embedding est une représentation numérique d'un texte, d'une image ou d'une donnée sous forme de vecteur (une liste de nombres). Cette représentation capture le sens sémantique de la donnée : des textes avec des significations similaires auront des vecteurs proches dans l'espace mathématique. Par exemple, les mots "chat" et "félin" auront des embeddings similaires, tandis que "chat" et "avion" auront des embeddings très différents. Les embeddings permettent aux machines de comprendre et de comparer le sens du texte de manière mathématique.`,
        metaphor: `Pensez aux embeddings comme à des coordonnées GPS pour les concepts. Si vous voulez trouver des concepts similaires à "intelligence artificielle", vous cherchez les points qui sont géographiquement proches dans l'espace des embeddings. C'est comme une carte où les idées liées sont placées les unes près des autres, et les idées différentes sont éloignées.`,
        whyItMatters: `Les embeddings sont fondamentaux pour la plupart des systèmes IA modernes. Ils permettent de faire de la recherche sémantique (trouver des documents par sens, pas par mots-clés), du clustering (grouper des textes similaires), et de la recommandation. Dans le contexte des LLMs et du RAG, les embeddings sont utilisés pour convertir les documents en vecteurs, puis pour trouver les passages les plus pertinents à donner au modèle. Sans embeddings, les systèmes de recherche d'information seraient beaucoup moins intelligents.`,
        foundInGraph: false,
      },
      en: {
        term: "Embedding (Vector representation)",
        simpleDefinition: `An embedding is a numerical representation of text, an image, or data in the form of a vector (a list of numbers). This representation captures the semantic meaning of the data: texts with similar meanings will have vectors that are close together in mathematical space. For example, the words "cat" and "feline" will have similar embeddings, while "cat" and "airplane" will have very different embeddings. Embeddings allow machines to understand and compare the meaning of text in a mathematical way.`,
        metaphor: `Think of embeddings as GPS coordinates for concepts. If you want to find concepts similar to "artificial intelligence," you look for points that are geographically close in the embedding space. It's like a map where related ideas are placed near each other, and different ideas are far apart.`,
        whyItMatters: `Embeddings are fundamental to most modern AI systems. They enable semantic search (finding documents by meaning, not just keywords), clustering (grouping similar texts), and recommendation systems. In the context of LLMs and RAG, embeddings are used to convert documents into vectors, then to find the most relevant passages to give to the model. Without embeddings, information retrieval systems would be much less intelligent.`,
        foundInGraph: false,
      }
    },
    "fine-tuning": {
      fr: {
        term: "Fine-tuning (Ajustement fin)",
        simpleDefinition: `Le fine-tuning est une technique qui permet d'ajuster un modèle de langage pré-entraîné sur des données spécifiques à une tâche ou un domaine. Au lieu de partir de zéro, on prend un modèle généraliste (comme GPT ou Llama) et on continue son entraînement avec un dataset plus petit mais plus spécialisé. Par exemple, on peut fine-tuner un modèle général sur des textes juridiques pour créer un assistant juridique spécialisé, ou sur des conversations médicales pour créer un assistant de santé.`,
        metaphor: `Imaginez un médecin généraliste très compétent qui a étudié toutes les branches de la médecine. Le fine-tuning, c'est comme lui donner une formation supplémentaire de 2 semaines dans un hôpital spécialisé en cardiologie. Après cette formation, il reste un excellent médecin, mais il est devenu particulièrement expert en cardiologie. Il peut toujours soigner d'autres maladies, mais il excelle maintenant dans son domaine spécialisé.`,
        whyItMatters: `Le fine-tuning est essentiel pour adapter des LLMs généraux à des cas d'usage spécifiques en entreprise. Un modèle généraliste peut répondre correctement à des questions générales, mais il ne connaît pas le jargon de votre entreprise, vos produits spécifiques, ou le ton que vous voulez utiliser. Le fine-tuning permet de créer des modèles qui parlent comme votre marque, qui connaissent vos produits, et qui se comportent exactement comme vous le souhaitez. C'est particulièrement important pour les applications qui nécessitent un haut niveau de précision ou un style particulier.`,
        foundInGraph: false,
      },
      en: {
        term: "Fine-tuning",
        simpleDefinition: `Fine-tuning is a technique that allows you to adjust a pre-trained language model on data specific to a particular task or domain. Instead of starting from scratch, you take a general-purpose model (like GPT or Llama) and continue training it with a smaller but more specialized dataset. For example, you can fine-tune a general model on legal texts to create a specialized legal assistant, or on medical conversations to create a healthcare assistant.`,
        metaphor: `Imagine a highly competent general practitioner who has studied all branches of medicine. Fine-tuning is like giving them 2 weeks of additional training in a specialized cardiology hospital. After this training, they're still an excellent doctor, but they've become particularly expert in cardiology. They can still treat other illnesses, but they now excel in their specialized domain.`,
        whyItMatters: `Fine-tuning is essential for adapting general LLMs to specific enterprise use cases. A general-purpose model can answer general questions correctly, but it doesn't know your company's jargon, your specific products, or the tone you want to use. Fine-tuning allows you to create models that speak in your brand's voice, know your products, and behave exactly as you want. This is especially important for applications requiring high precision or a particular style.`,
        foundInGraph: false,
      }
    },
    "llm": {
      fr: {
        term: "LLM (Large Language Model)",
        simpleDefinition: `Un LLM, ou Large Language Model (Grand Modèle de Langue), est un type d'intelligence artificielle entraîné sur d'énormes quantités de texte provenant d'Internet. Ces modèles apprennent à prédire le mot suivant dans une phrase, ce qui leur permet de comprendre et de générer du texte de manière très sophistiquée. Les LLMs peuvent répondre à des questions, écrire des articles, résumer des documents, traduire des textes, écrire du code, et bien plus encore. Ils sont basés sur une architecture appelée "transformer" et comptent souvent des milliards de paramètres.`,
        metaphor: `Imaginez une personne qui a lu presque tout Internet : des livres, des articles, des forums, des conversations, des documentations techniques, etc. Cette personne a une connaissance encyclopédique et peut discuter de pratiquement n'importe quel sujet. Un LLM, c'est cette personne, mais sous forme de programme informatique. Il peut répondre à vos questions, vous expliquer des concepts, vous aider à écrire, mais il ne "pense" pas vraiment comme un humain : il prédit des mots probables basés sur ce qu'il a lu.`,
        whyItMatters: `Les LLMs sont la technologie de base de l'IA générative moderne. Ils sont utilisés dans des chatbots, des assistants de productivité, des outils de création de contenu, des systèmes de traduction, et même dans des applications scientifiques. Pour un ingénieur LLM, comprendre comment fonctionnent ces modèles est essentiel : cela permet de mieux les utiliser, de les optimiser, de réduire leurs défauts (comme les hallucinations), et de construire des applications plus fiables. Les LLMs sont le moteur de la révolution actuelle de l'IA.`,
        foundInGraph: false,
      },
      en: {
        term: "LLM (Large Language Model)",
        simpleDefinition: `An LLM, or Large Language Model, is a type of artificial intelligence trained on massive amounts of text from the Internet. These models learn to predict the next word in a sentence, which allows them to understand and generate text in a very sophisticated way. LLMs can answer questions, write articles, summarize documents, translate text, write code, and much more. They are based on an architecture called "transformer" and often have billions of parameters.`,
        metaphor: `Imagine a person who has read almost everything on the Internet: books, articles, forums, conversations, technical documentation, and more. This person has encyclopedic knowledge and can discuss virtually any topic. An LLM is that person, but in the form of a computer program. It can answer your questions, explain concepts, help you write, but it doesn't really "think" like a human: it predicts likely words based on what it has read.`,
        whyItMatters: `LLMs are the foundational technology of modern generative AI. They are used in chatbots, productivity assistants, content creation tools, translation systems, and even scientific applications. For an LLM engineer, understanding how these models work is essential: it allows you to use them better, optimize them, reduce their flaws (like hallucinations), and build more reliable applications. LLMs are the engine of the current AI revolution.`,
        foundInGraph: false,
      }
    },
    "token": {
      fr: {
        term: "Token (Jeton)",
        simpleDefinition: `Un token est l'unité de base que les LLMs utilisent pour traiter le texte. Au lieu de travailler avec des caractères ou des mots complets, les modèles découpent le texte en tokens, qui peuvent être des mots entiers, des parties de mots, ou même des caractères individuels. Par exemple, la phrase "Le chat mange" pourrait être découpée en tokens comme ["Le", " chat", " mange"]. Un token représente généralement environ 4 caractères ou 0.75 mot en moyenne. Les LLMs voient et génèrent du texte sous forme de séquences de tokens.`,
        metaphor: `Pensez aux tokens comme à des briques LEGO qui composent un texte. Quand vous écrivez une phrase, le LLM la voit comme une série de briques LEGO. Pour comprendre ou générer du texte, il assemble ces briques une par une. Certaines briques sont grosses (des mots entiers comme "ordinateur"), d'autres sont petites (des parties de mots comme "tion" dans "information"). Le LLM sait comment assembler ces briques pour former du texte cohérent.`,
        whyItMatters: `La tokenisation est fondamentale car elle détermine comment le LLM voit et traite le texte. Le nombre de tokens influence le coût (les APIs facturent par token), la vitesse de traitement, et la qualité des résultats. Comprendre la tokenisation aide à optimiser les prompts (pour utiliser moins de tokens), à gérer les limites de contexte (le nombre maximum de tokens qu'un modèle peut traiter), et à diagnostiquer des problèmes. Par exemple, si un texte en français est mal tokenisé, le modèle peut avoir des performances médiocres.`,
        foundInGraph: false,
      },
      en: {
        term: "Token",
        simpleDefinition: `A token is the basic unit that LLMs use to process text. Instead of working with characters or complete words, models break text into tokens, which can be whole words, parts of words, or even individual characters. For example, the sentence "The cat eats" might be tokenized into ["The", " cat", " eats"]. A token typically represents about 4 characters or 0.75 words on average. LLMs see and generate text as sequences of tokens.`,
        metaphor: `Think of tokens as LEGO bricks that make up text. When you write a sentence, the LLM sees it as a series of LEGO bricks. To understand or generate text, it assembles these bricks one by one. Some bricks are large (whole words like "computer"), others are small (word parts like "tion" in "information"). The LLM knows how to assemble these bricks to form coherent text.`,
        whyItMatters: `Tokenization is fundamental because it determines how the LLM sees and processes text. The number of tokens affects cost (APIs charge per token), processing speed, and output quality. Understanding tokenization helps optimize prompts (to use fewer tokens), manage context limits (the maximum number of tokens a model can process), and diagnose issues. For example, if French text is poorly tokenized, the model may perform poorly.`,
        foundInGraph: false,
      }
    },
    "vector": {
      fr: {
        term: "Vecteur (représentation mathématique)",
        simpleDefinition: `Un vecteur, dans le contexte de l'IA, est une liste de nombres (généralement entre 100 et 1536 dimensions) qui représente de manière mathématique le sens d'un texte, d'une image ou d'une donnée. Chaque dimension du vecteur capture une caractéristique particulière du contenu. Deux vecteurs similaires signifient que les contenus qu'ils représentent ont des significations similaires. Les vecteurs permettent de faire des calculs mathématiques sur du sens : on peut mesurer la distance entre deux concepts, trouver des concepts similaires, ou regrouper des textes par thème.`,
        metaphor: `Imaginez que chaque concept est un point dans un espace en 3D. Le mot "joie" serait un point, le mot "bonheur" serait un point très proche, tandis que "tristesse" serait un point à l'opposé. Dans la réalité, les embeddings ont des centaines de dimensions, pas juste 3, mais le principe est le même : les concepts liés sont proches dans cet espace mathématique.`,
        whyItMatters: `Les vecteurs sont au cœur de nombreuses technologies IA modernes. Ils permettent la recherche sémantique (trouver des documents par sens), le clustering (grouper des textes similaires), la recommandation (suggérer des contenus liés), et sont essentiels au fonctionnement du RAG. Sans représentations vectorielles, les machines ne pourraient pas "comprendre" le sens du texte de manière quantitative. Les bases de données vectorielles (comme Pinecone, Weaviate, Qdrant) sont construites autour de ce concept pour stocker et rechercher efficacement des embeddings.`,
        foundInGraph: false,
      },
      en: {
        term: "Vector (mathematical representation)",
        simpleDefinition: `A vector, in the context of AI, is a list of numbers (typically between 100 and 1536 dimensions) that mathematically represents the meaning of text, an image, or data. Each dimension of the vector captures a particular characteristic of the content. Two similar vectors mean the contents they represent have similar meanings. Vectors allow mathematical calculations on meaning: you can measure the distance between two concepts, find similar concepts, or group texts by theme.`,
        metaphor: `Imagine each concept is a point in 3D space. The word "joy" would be one point, the word "happiness" would be a very close point, while "sadness" would be a point on the opposite side. In reality, embeddings have hundreds of dimensions, not just 3, but the principle is the same: related concepts are close together in this mathematical space.`,
        whyItMatters: `Vectors are at the heart of many modern AI technologies. They enable semantic search (finding documents by meaning), clustering (grouping similar texts), recommendation systems (suggesting related content), and are essential to RAG functionality. Without vector representations, machines couldn't "understand" text meaning in a quantitative way. Vector databases (like Pinecone, Weaviate, Qdrant) are built around this concept to store and search embeddings efficiently.`,
        foundInGraph: false,
      }
    },
    "prompt": {
      fr: {
        term: "Prompt (Consigne)",
        simpleDefinition: `Un prompt est l'instruction ou le texte que vous donnez à un LLM pour lui dire quoi faire. C'est la façon dont vous "parlez" au modèle pour obtenir le résultat souhaité. Un bon prompt est clair, précis, et donne suffisamment de contexte au modèle. Par exemple, "Résume ce texte en 3 phrases" est un prompt simple, tandis qu'un prompt plus détaillé pourrait inclure le rôle du modèle, le format attendu, des exemples, et des contraintes spécifiques. Le prompt engineering est l'art de concevoir des prompts efficaces pour obtenir les meilleures réponses possibles.`,
        metaphor: `Pensez au prompt comme aux instructions que vous donnez à un assistant très capable mais très littéral. Si vous dites "Fais-moi un résumé", l'assistant pourrait faire un résumé d'un paragraphe ou de dix pages. Mais si vous dites "Fais-moi un résumé de 3 phrases qui explique les concepts clés pour un débutant", vous obtiendrez exactement ce que vous voulez. Plus vos instructions sont précises, meilleur est le résultat.`,
        whyItMatters: `Le prompt est l'interface principale entre les humains et les LLMs. La qualité du prompt détermine directement la qualité de la réponse. Un bon prompt peut transformer un modèle moyen en un outil puissant, tandis qu'un mauvais prompt peut donner des résultats inutiles même avec le meilleur modèle. Le prompt engineering est une compétence essentielle pour tout ingénieur LLM, car c'est souvent la façon la plus rapide et la moins coûteuse d'améliorer les performances d'une application sans modifier le modèle lui-même.`,
        foundInGraph: false,
      },
      en: {
        term: "Prompt",
        simpleDefinition: `A prompt is the instruction or text you give to an LLM to tell it what to do. It's how you "talk" to the model to get the desired result. A good prompt is clear, specific, and provides enough context for the model. For example, "Summarize this text in 3 sentences" is a simple prompt, while a more detailed prompt might include the model's role, the expected format, examples, and specific constraints. Prompt engineering is the art of designing effective prompts to get the best possible responses.`,
        metaphor: `Think of the prompt as instructions you give to a very capable but very literal assistant. If you say "Give me a summary," the assistant might make a one-paragraph summary or a ten-page summary. But if you say "Give me a 3-sentence summary explaining the key concepts for a beginner," you'll get exactly what you want. The more precise your instructions, the better the result.`,
        whyItMatters: `The prompt is the main interface between humans and LLMs. Prompt quality directly determines response quality. A good prompt can transform an average model into a powerful tool, while a bad prompt can give useless results even with the best model. Prompt engineering is an essential skill for any LLM engineer because it's often the fastest and least expensive way to improve application performance without modifying the model itself.`,
        foundInGraph: false,
      }
    },
    "agent": {
      fr: {
        term: "Agent (Entité autonome)",
        simpleDefinition: `Un agent IA est un système autonome qui peut percevoir son environnement, prendre des décisions, et agir pour atteindre des objectifs spécifiques. Contrairement à un LLM classique qui répond à une question et s'arrête là, un agent peut planifier plusieurs étapes, utiliser des outils (comme des APIs, des bases de données, des moteurs de recherche), et itérer jusqu'à ce qu'il atteigne son but. Les agents utilisent souvent des architectures comme ReAct (Reasoning + Acting) qui alternent entre réflexion et action.`,
        metaphor: `Imaginez un travailleur autonome à qui vous donnez une mission : "Prépare un rapport de marché sur les voitures électriques". Au lieu de répondre directement, ce travailleur va : 1) chercher des informations récentes sur Internet, 2) lire des articles spécialisés, 3) extraire les données de ventes, 4) organiser les informations, 5) rédiger le rapport, et 6) vous le présenter. Il prend des décisions tout au long du processus et peut ajuster sa stratégie si quelque chose ne fonctionne pas.`,
        whyItMatters: `Les agents représentent une évolution majeure dans l'utilisation des LLMs. Au lieu d'avoir des interactions simples question-réponse, les agents peuvent accomplir des tâches complexes de manière autonome. C'est particulièrement puissant pour l'automatisation de workflows, la résolution de problèmes complexes, et la création d'assistants vraiment utiles. Pour un ingénieur LLM, comprendre comment concevoir, implémenter et évaluer des agents est devenu une compétence critique, car c'est l'une des tendances les plus importantes dans le déploiement de l'IA en entreprise.`,
        foundInGraph: false,
      },
      en: {
        term: "Agent (Autonomous entity)",
        simpleDefinition: `An AI agent is an autonomous system that can perceive its environment, make decisions, and act to achieve specific goals. Unlike a regular LLM that answers a question and stops there, an agent can plan multiple steps, use tools (like APIs, databases, search engines), and iterate until it reaches its goal. Agents often use architectures like ReAct (Reasoning + Acting) that alternate between thinking and acting.`,
        metaphor: `Imagine an autonomous worker to whom you give a mission: "Prepare a market report on electric cars." Instead of answering directly, this worker will: 1) search for recent information on the Internet, 2) read specialized articles, 3) extract sales data, 4) organize the information, 5) write the report, and 6) present it to you. They make decisions throughout the process and can adjust their strategy if something doesn't work.`,
        whyItMatters: `Agents represent a major evolution in the use of LLMs. Instead of simple question-answer interactions, agents can accomplish complex tasks autonomously. This is particularly powerful for workflow automation, solving complex problems, and creating truly useful assistants. For an LLM engineer, understanding how to design, implement, and evaluate agents has become a critical skill, as it is one of the most important trends in enterprise AI deployment.`,
        foundInGraph: false,
      }
    }
  };

  return definitions[lowerTerm]?.[language] || {
    term: term,
    simpleDefinition: isEn ? "Definition not found." : "Définition non trouvée.",
    metaphor: isEn ? "Metaphor not available." : "Métaphore non disponible.",
    whyItMatters: isEn ? "Importance not available." : "Importance non disponible.",
    foundInGraph: false,
  };
}