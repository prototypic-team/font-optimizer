import { Component, JSX, splitProps } from 'solid-js'

import { cn } from '../cn'
import styles from './ButtonsGroup.module.css'

type Props = Omit<JSX.HTMLAttributes<HTMLDivElement>, 'classList'>

export const ButtonsGroup: Component<Props> = (props) => {
	const [local, other] = splitProps(props, ['children', 'class'])
	return (
		<div class={cn(styles.group, local.class)} {...other}>
			{local.children}
		</div>
	)
}
