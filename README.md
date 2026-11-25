# Estimador de previsões

Aplicação web estática em português para estimar probabilidades de eventos binários combinando uma probabilidade de mercado, uma taxa-base e sinais informados pelo usuário.

## Executar localmente

Abra `index.html` em um navegador ou sirva a pasta com um servidor HTTP estático.

## Como funciona

O algoritmo combina mercado e taxa-base em log-odds. Cada sinal ajusta essa linha de base de acordo com sua confiabilidade, tamanho da amostra e idade. Os padrões são meia-vida de 14 dias e suavização de amostra com constante 20.

## Limitações

O app não coleta cotações nem resultados, não treina modelos e não armazena as entradas. As estimativas dependem das probabilidades e da confiabilidade informadas pelo usuário; não são garantia nem recomendação de negociação.