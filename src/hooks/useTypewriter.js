import { useState, useEffect } from 'react'

function useTypewriter(roles) {
  const [roleIndex, setRoleIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(150)

  useEffect(() => {
    const currentRole = roles[roleIndex]

    const handleTyping = () => {
      if (!isDeleting) {
        if (displayText.length < currentRole.length) {
          setDisplayText(currentRole.substring(0, displayText.length + 1))
          setTypingSpeed(150)
        } else {
          setIsDeleting(true)
          setTypingSpeed(2000) // Pause for 2s at the end of the word
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(currentRole.substring(0, displayText.length - 1))
          setTypingSpeed(75)
        } else {
          setIsDeleting(false)
          setRoleIndex((prev) => (prev + 1) % roles.length)
          setTypingSpeed(500) // Pause for 0.5s before typing the next word
        }
      }
    }

    const timer = setTimeout(handleTyping, typingSpeed)
    return () => clearTimeout(timer)
  }, [displayText, isDeleting, roleIndex, roles, typingSpeed])

  return displayText
}

export default useTypewriter
