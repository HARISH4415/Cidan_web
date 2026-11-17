export function simulateDocumentUpload(file: File) {
  if (!file) {
    return Promise.reject(new Error('Choose a document before starting the upload simulation.'))
  }

  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 1200)
  })
}
