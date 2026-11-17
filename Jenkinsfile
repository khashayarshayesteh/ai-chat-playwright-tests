// Requires a Jenkins agent with Node.js 20+ installed.
pipeline {
  agent any
  environment { CI = 'true' }
  stages {
    stage('Install') {
      steps {
        sh 'npm install'
        sh 'npx playwright install --with-deps chromium'
      }
    }
    stage('E2E (UI)') { steps { sh 'npx playwright test --project=setup --project=e2e' } }
    stage('AI evals') { steps { sh 'npx playwright test --project=eval' } }
  }
  post {
    always {
      junit 'test-results/junit.xml'
      archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
    }
  }
}
