// Ported from the original admin.js.
//
// A photo straight off a phone is often 4-6 MB. Uploading that over cell
// service from a field is slow enough that you'd stop bothering to post.
// This shrinks it to 1200px wide at 90% JPEG quality first — usually a
// 10-20x reduction with no visible difference on a web page.
export async function resizeImage(file, maxWidth = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        let { width, height } = img

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error('Failed to resize image')),
          'image/jpeg',
          0.9
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }

    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}
